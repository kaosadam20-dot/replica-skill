import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../state/AuthContext'
import { StatusBar } from '../components/StatusBar'

export function Login() {
  const { refresh } = useAuth()
  const [handle, setHandle] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (value: string) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await api.start(value)
      await refresh()
    } catch (caught) {
      setError((caught as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <StatusBar />
      <div className="login__top">
        <span className="wordmark">latent</span>
        <span className="eyebrow">android</span>
      </div>

      <div className="login__art" aria-hidden="true">
        <div className="login__ghost">02:41:18</div>
        <div className="login__ghost-label">today, witnessed</div>
      </div>

      <div className="login__body">
        <h1>Show up, then watch it add up.</h1>
        <p className="lead">
          A focus camera for the hours nobody sees. Record your work, keep the clip, and let the numbers
          pile up.
        </p>

        <form
          className="login__form"
          onSubmit={(event) => {
            event.preventDefault()
            submit(handle)
          }}
        >
          <div className="field">
            <label htmlFor="handle">Your handle</label>
            <div className="handle-wrap">
              <span>@</span>
              <input
                id="handle"
                className="input input--handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="yourname"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={20}
              />
            </div>
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="btn btn--primary" type="submit" disabled={busy || !handle.trim()}>
            {busy ? 'One moment…' : 'Claim my handle'}
          </button>
        </form>

        <div className="login__divider">or</div>
        <button className="btn btn--ghost" onClick={() => submit('malcolm')} disabled={busy}>
          Continue as @malcolm
        </button>
        <p className="login__foot">Sessions stay private until you choose to share them.</p>
      </div>

      <div className="login__glow" aria-hidden="true" />
    </div>
  )
}
