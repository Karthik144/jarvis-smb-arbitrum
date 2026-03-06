// app/components/payment-card/index.tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Badge from "@/app/components/badge";

interface PaymentCardProps {
  variant: "buyer" | "seller";
  company: string;
  terms: string;
  amount: string;
  badges: string[];
  // buyer only
  paid?: string;
  // seller only
  remaining?: string;
  onClaim?: () => void;
}

export default function PaymentCard({
  variant,
  company,
  terms,
  amount,
  badges,
  paid,
  remaining,
  onClaim,
}: PaymentCardProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #F0F0F0",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        px: 4,
        py: 3,
      }}
    >
      {/* Left column */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          sx={{
            fontSize: "17px",
            fontWeight: 600,
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          {company}
        </Typography>
        <Typography
          sx={{ fontSize: "14px", color: "#777777", fontFamily: "inherit" }}
        >
          {terms}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {badges.map((badge) => (
            <Badge key={badge} label={badge} />
          ))}
        </Box>
      </Box>

      {/* Right column */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: variant === "seller" ? 1.5 : 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#000000",
            fontFamily: "inherit",
          }}
        >
          {amount}
        </Typography>

        {variant === "buyer" && paid && (
          <Typography
            sx={{ fontSize: "13px", color: "#999999", fontFamily: "inherit" }}
          >
            {paid}
          </Typography>
        )}

        {variant === "seller" && (
          <>
            {remaining && (
              <Typography
                sx={{
                  fontSize: "13px",
                  color: "#999999",
                  fontFamily: "inherit",
                }}
              >
                {remaining}
              </Typography>
            )}
            <Button
              onClick={onClaim}
              sx={{
                backgroundColor: "#171717",
                color: "#FFFFFF",
                borderRadius: "8px",
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                fontFamily: "inherit",
                "&:hover": { backgroundColor: "#2a2a2a" },
              }}
            >
              Claim
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
