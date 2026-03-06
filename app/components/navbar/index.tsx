"use client";

import { useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { usePrivy, useLogin } from "@privy-io/react-auth";

export default function Navbar() {
  const router = useRouter();
  const { authenticated } = usePrivy();

  const { login } = useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated) {
        router.push("/dashboard");
      }
    },
  });

  const handleAuthAction = () => {
    if (authenticated) {
      router.push("/dashboard");
    } else {
      login();
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{ backgroundColor: "#FFFFFF", borderBottom: "none" }}
      >
        <Toolbar sx={{ px: 7, py: "20px", minHeight: "unset !important" }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              color: "#000000",
              fontWeight: 700,
              fontSize: "20px",
              letterSpacing: "-0.3px",
              fontFamily: "inherit",
            }}
          >
            Jarvis
          </Typography>
          <Button
            onClick={handleAuthAction}
            variant="outlined"
            sx={{
              color: "#000000",
              textTransform: "none",
              borderColor: "#E0E0E0",
              borderRadius: "8px",
              backgroundColor: "#FFFFFF",
              fontWeight: 500,
              fontSize: "14px",
              px: 2.5,
              py: 1,
              "&:hover": {
                backgroundColor: "#F5F5F5",
                borderColor: "#CCCCCC",
              },
            }}
          >
            {authenticated ? "Dashboard" : "Login"}
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
