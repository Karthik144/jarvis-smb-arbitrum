"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import GetStartedModal from "./components/get-started-modal";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 120% at 50% 60%, #F0F0F0 0%, #FFFFFF 100%)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            textAlign: "center",
            px: 3,
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "36px", md: "52px" },
              letterSpacing: "-1.5px",
              color: "#000000",
              maxWidth: "640px",
              lineHeight: 1.1,
              fontFamily: "inherit",
            }}
          >
            Programmable payments for your business
          </Typography>

          <Typography
            sx={{
              fontSize: "17px",
              color: "#555555",
              lineHeight: 1.7,
              maxWidth: "560px",
              fontFamily: "inherit",
            }}
          >
            Schedule, split, and verify payments with smart contracts and
            zero-knowledge proofs.
          </Typography>

          <Button
            onClick={() => setModalOpen(true)}
            sx={{
              mt: 1,
              backgroundColor: "#171717",
              color: "#FFFFFF",
              borderRadius: "10px",
              px: 3.5,
              py: 1.75,
              textTransform: "none",
              fontSize: "16px",
              fontWeight: 600,
              fontFamily: "inherit",
              letterSpacing: "-0.2px",
              "&:hover": { backgroundColor: "#2a2a2a" },
            }}
          >
            Get Started
          </Button>
        </Box>
      </Box>

      <GetStartedModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
