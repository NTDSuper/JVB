import LoginForm from "./form";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card-wrap animate-slide-up">
        <div className="card-glass" style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 28 }}>
            <div className="auth-brand">SuperMart</div>
            <p className="auth-subtitle">Sign in to your account</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
