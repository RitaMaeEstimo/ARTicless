'use client';

export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
