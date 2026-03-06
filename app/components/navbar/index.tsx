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
    onComplete: ({ user, isNewUser, wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated) {
        router.push("/validation");
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
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, color: "black" }}
          >
            Jarvis
          </Typography>
          <Button
            onClick={handleAuthAction}
            sx={{ color: "black", textTransform: "none" }}
          >
            {authenticated ? "Dashboard" : "Login"}
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
