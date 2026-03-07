"use client";

import { useRouter, usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

export default function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentRole = () => {
    if (pathname?.includes("/buyer")) return "buyer";
    if (pathname?.includes("/seller")) return "seller";
    if (pathname?.includes("/lender")) return "lender";
    return "buyer";
  };

  const currentRole = getCurrentRole();

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    router.push(`/payments/${newValue}`);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "#E0E0E0", mb: 3 }}>
      <Tabs
        value={currentRole}
        onChange={handleChange}
        sx={{
          "& .MuiTab-root": {
            textTransform: "none",
            fontSize: "15px",
            fontWeight: 500,
            fontFamily: "inherit",
            color: "#777777",
            minHeight: 48,
            "&.Mui-selected": {
              color: "#000000",
              fontWeight: 600,
            },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "#171717",
            height: 2,
          },
        }}
      >
        <Tab label="Buyer" value="buyer" />
        <Tab label="Seller" value="seller" />
        <Tab label="Lender" value="lender" />
      </Tabs>
    </Box>
  );
}
