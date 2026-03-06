import { Box, Typography } from "@mui/material";

export default function Dashboard() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Jarvis Dashboard
      </Typography>
      <Typography variant="body1">Welcome to your secure dashboard.</Typography>
    </Box>
  );
}
