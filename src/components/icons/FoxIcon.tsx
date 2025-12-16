interface FoxIconProps {
  className?: string;
  size?: number;
}

const FoxIcon = ({ className = "", size = 120 }: FoxIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fox head base */}
      <path
        d="M60 95C82 95 95 78 95 60C95 42 82 30 60 30C38 30 25 42 25 60C25 78 38 95 60 95Z"
        fill="hsl(25, 95%, 55%)"
      />
      
      {/* Left ear */}
      <path
        d="M25 45L15 15L40 35L25 45Z"
        fill="hsl(25, 95%, 55%)"
      />
      <path
        d="M22 38L18 22L35 35L22 38Z"
        fill="hsl(25, 95%, 45%)"
      />
      
      {/* Right ear */}
      <path
        d="M95 45L105 15L80 35L95 45Z"
        fill="hsl(25, 95%, 55%)"
      />
      <path
        d="M98 38L102 22L85 35L98 38Z"
        fill="hsl(25, 95%, 45%)"
      />
      
      {/* Inner ear accent */}
      <path
        d="M23 35L20 25L32 33L23 35Z"
        fill="hsl(0, 0%, 98%)"
        opacity="0.3"
      />
      <path
        d="M97 35L100 25L88 33L97 35Z"
        fill="hsl(0, 0%, 98%)"
        opacity="0.3"
      />
      
      {/* White face marking */}
      <path
        d="M60 90C72 90 80 80 80 70C80 60 72 55 60 55C48 55 40 60 40 70C40 80 48 90 60 90Z"
        fill="hsl(0, 0%, 98%)"
      />
      
      {/* Snout */}
      <ellipse
        cx="60"
        cy="75"
        rx="12"
        ry="8"
        fill="hsl(0, 0%, 98%)"
      />
      
      {/* Nose */}
      <ellipse
        cx="60"
        cy="70"
        rx="5"
        ry="4"
        fill="hsl(0, 0%, 15%)"
      />
      
      {/* Left eye */}
      <ellipse
        cx="45"
        cy="55"
        rx="6"
        ry="7"
        fill="hsl(0, 0%, 15%)"
      />
      <circle
        cx="47"
        cy="53"
        r="2"
        fill="hsl(0, 0%, 98%)"
      />
      
      {/* Right eye */}
      <ellipse
        cx="75"
        cy="55"
        rx="6"
        ry="7"
        fill="hsl(0, 0%, 15%)"
      />
      <circle
        cx="77"
        cy="53"
        r="2"
        fill="hsl(0, 0%, 98%)"
      />
      
      {/* Subtle smile line */}
      <path
        d="M55 78Q60 82 65 78"
        stroke="hsl(0, 0%, 70%)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default FoxIcon;
