import { useNavigate } from 'react-router-dom';
import './Terms.css';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="terms-page">
      <div className="terms-container">
        <div className="terms-header">
          <button className="terms-back" onClick={() => navigate('/')}>← Back</button>
          <h1>Terms &amp; Conditions</h1>
          <p className="terms-updated">BharatShramSetu · Last updated: 2026</p>
        </div>

        <div className="terms-body">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By registering or using the BharatShramSetu platform, you agree to these Terms &amp; Conditions.
            If you do not agree, please do not use the platform.
          </p>

          <h2>2. Registration and Accounts</h2>
          <p>
            You must provide accurate information when registering. You are responsible for
            safeguarding your login credentials, OTP and MPIN. Any activity under your account
            is your responsibility.
          </p>

          <h2>3. Workforce Identity & QR</h2>
          <p>
            Every Employer, Contractor and Worker is issued a unique identity with a QR reference.
            The QR is used for identity verification, binding and attendance. Do not share your
            QR or credentials with others.
          </p>

          <h2>4. Permitted Use</h2>
          <p>
            You agree to use the platform only for lawful purposes and in accordance with the
            role granted to you (Super Admin, Employer, Contractor, or Worker). Unauthorized
            access, data tampering, or misuse is prohibited.
          </p>

          <h2>5. Data & Privacy</h2>
          <p>
            Your personal and workforce data is handled per our Privacy Policy. Geo-location may
            be captured for attendance verification. We implement reasonable security measures
            to protect your data.
          </p>

          <h2>6. Termination</h2>
          <p>
            We may suspend or terminate access for violation of these terms, without notice,
            where required by law or security policy.
          </p>

          <h2>7. Contact</h2>
          <p>For questions about these terms, contact support at <strong>9650887008</strong>.</p>
        </div>
      </div>
    </div>
  );
}
