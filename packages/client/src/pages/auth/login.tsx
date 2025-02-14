import Link from 'next/link'

export default function Login() {
  return (
    <div className="container">
      <h2>Login</h2>
      <form>
        <div>
          <label>Email:</label>
          <input type="email" placeholder="Your email" />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" placeholder="Your password" />
        </div>
        <button type="submit">Log In</button>
      </form>
      <p>
        Don't have an account? <Link href="/auth/signup">Sign Up</Link>
      </p>
    </div>
  )
}