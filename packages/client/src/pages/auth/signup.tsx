import Link from 'next/link'

export default function Signup() {
  return (
    <div className="container">
      <h2>Sign Up</h2>
      <form>
        <div>
          <label>Email:</label>
          <input type="email" placeholder="Your email" />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" placeholder="Create a password" />
        </div>
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already registered? <Link href="/auth/login">Log In</Link>
      </p>
    </div>
  )
}