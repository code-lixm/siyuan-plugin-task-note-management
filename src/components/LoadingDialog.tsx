import React from 'react';

interface LoadingDialogProps {
    message: string;
}

export function LoadingDialog({ message }: LoadingDialogProps) {
    return (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 50 50" role="img" aria-label="loading">
                <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="var(--b3-theme-primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="80 40"
                >
                    <animateTransform
                        attributeName="transform"
                        attributeType="XML"
                        type="rotate"
                        from="0 25 25"
                        to="360 25 25"
                        dur="1s"
                        repeatCount="indefinite"
                    />
                </circle>
            </svg>
            <div style={{ fontSize: '14px', color: 'var(--b3-theme-on-background)' }}>{message}</div>
        </div>
    );
}

export default LoadingDialog;
