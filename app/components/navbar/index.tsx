// app/components/navbar/index.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import {
  usePrivy,
  useLogin,
  useLogout,
  useFundWallet,
  useWallets,
} from "@privy-io/react-auth";
import { getUserByWalletAddress } from "@/lib/api/users";

const commonButtonStyles = {
  color: "#000000",
  textTransform: "none" as const,
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
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, user: hookUser } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();

  const { login } = useLogin({
    onComplete: ({ wasAlreadyAuthenticated }) => {
      if (!wasAlreadyAuthenticated) {
        router.push("/dashboard");
      }
    },
  });

  const { logout } = useLogout({
    onSuccess: () => router.push("/"),
  });

  const handleFundWallet = () => {
    const wallet = wallets.find((w) => w.walletClientType === "privy");
    if (wallet) {
      fundWallet({ address: wallet.address });
    }
  };

  const isPaymentsRoute = pathname?.startsWith("/payments");
  const isHomeRoute = pathname === "/";

  const handleAuthAction = async (e: React.MouseEvent<HTMLButtonElement>) => {
    (e.currentTarget as HTMLButtonElement).blur();
    if (isPaymentsRoute && authenticated) {
      logout();
    } else if (authenticated) {
      router.push("/dashboard");
    } else {
      login();
    }
  };

  const buttonLabel = () => {
    if (isPaymentsRoute && authenticated) return "Sign Out";
    if (authenticated) return "Dashboard";
    return "Login";
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "#FFFFFF",
          borderBottom: isPaymentsRoute ? "1px solid #E0E0E0" : "none",
        }}
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

          {authenticated && !isHomeRoute && (
            <Button
              onClick={handleFundWallet}
              variant="outlined"
              sx={{ ...commonButtonStyles, mr: 2 }}
            >
              Add Funds
            </Button>
          )}

          <Button
            onClick={(e) => handleAuthAction(e)}
            variant="outlined"
            sx={commonButtonStyles}
          >
            {buttonLabel()}
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
