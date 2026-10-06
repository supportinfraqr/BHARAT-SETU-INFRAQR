// Bharat Shram Setu wordmark in the Indian tricolour treatment used on the login page.
export default function BrandText({ className = '' }: { className?: string }) {
  return <span className={`font-semibold tracking-tight ${className}`} aria-label="Bharat Shram Setu">
    <span style={{ color: '#022B5E' }}>Bharat</span>
    <span style={{ color: '#E45D24' }}> Shram</span>
    <span style={{ color: '#14843C' }}> Setu</span>
  </span>;
}
