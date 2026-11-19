package app.latent.mobile;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Native shell for the Latent web app.
 *
 * The app itself stays a single web surface: this activity hosts it in a
 * full-screen WebView pointed at the URL baked in at build time, so the
 * session cookie, camera capture and routing behave exactly as they do in a
 * browser.
 */
public class MainActivity extends Activity {

    private static final int CAMERA_PERMISSION_REQUEST = 41;
    private static final int BACKGROUND = Color.parseColor("#0E0E0F");
    private static final int INK = Color.parseColor("#F4F2EE");
    private static final int MUTED = Color.parseColor("#9C9A95");

    private WebView webView;
    private View offlineView;
    private PermissionRequest pendingCameraRequest;
    private String appHost;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String appUrl = getString(R.string.app_url);
        appHost = Uri.parse(appUrl).getHost();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BACKGROUND);

        webView = new WebView(this);
        webView.setBackgroundColor(BACKGROUND);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " LatentAndroid/0.1");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);

        offlineView = buildOfflineView();

        webView.setWebViewClient(new LatentWebViewClient(this));
        webView.setWebChromeClient(new LatentChromeClient(this));

        root.addView(webView);
        root.addView(offlineView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        webView.loadUrl(appUrl);
    }

    private View buildOfflineView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(64, 64, 64, 64);
        panel.setBackgroundColor(BACKGROUND);
        panel.setVisibility(View.GONE);

        TextView title = new TextView(this);
        title.setText("Can't reach Latent");
        title.setTextColor(INK);
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);

        TextView body = new TextView(this);
        body.setText("Check your connection, then try again.");
        body.setTextColor(MUTED);
        body.setTextSize(15);
        body.setGravity(Gravity.CENTER);
        body.setPadding(0, 16, 0, 32);

        Button retry = new Button(this);
        retry.setText("Try again");
        retry.setOnClickListener(view -> {
            offlineView.setVisibility(View.GONE);
            webView.reload();
        });

        panel.addView(title);
        panel.addView(body);
        panel.addView(retry);
        return panel;
    }

    private void handlePermissionRequest(PermissionRequest request) {
        boolean wantsVideo = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                wantsVideo = true;
            }
        }
        if (!wantsVideo) {
            request.deny();
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            return;
        }
        pendingCameraRequest = request;
        requestPermissions(new String[] { Manifest.permission.CAMERA }, CAMERA_PERMISSION_REQUEST);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != CAMERA_PERMISSION_REQUEST || pendingCameraRequest == null) {
            return;
        }
        boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            pendingCameraRequest.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
        } else {
            pendingCameraRequest.deny();
        }
        pendingCameraRequest = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    /** Keeps in-app navigation inside the WebView and sends other hosts to the browser. */
    private static final class LatentWebViewClient extends WebViewClient {

        private final MainActivity activity;

        LatentWebViewClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String scheme = uri.getScheme();
            boolean web = "http".equals(scheme) || "https".equals(scheme);
            if (web && !uri.getHost().equals(activity.appHost)) {
                activity.startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
            return false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            activity.offlineView.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                activity.offlineView.setVisibility(View.VISIBLE);
            }
        }
    }

    /** Routes the page's camera request through the Android runtime permission. */
    private static final class LatentChromeClient extends WebChromeClient {

        private final MainActivity activity;

        LatentChromeClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            activity.runOnUiThread(() -> activity.handlePermissionRequest(request));
        }
    }
}
