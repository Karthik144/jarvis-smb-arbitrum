// app/components/badge/index.tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface BadgeProps {
  label: string;
}

export default function Badge({ label }: BadgeProps) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "20px",
        backgroundColor: "#F5F5F5",
        border: "1px solid #EBEBEB",
        px: 1.5,
        py: "4px",
      }}
    >
      <Typography
        sx={{
          fontSize: "12px",
          color: "#555555",
          fontWeight: 500,
          fontFamily: "inherit",
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
