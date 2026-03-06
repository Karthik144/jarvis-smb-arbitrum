// app/components/contacts-modal/index.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import { ethers } from "ethers";
import { Contact } from "@/lib/types";

interface ContactsModalProps {
  open: boolean;
  onClose: () => void;
  ownerAddress: string;
}

const inputSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#F5F5F5",
    borderRadius: "10px",
    fontSize: "14px",
    "& fieldset": { border: "none" },
    "&:hover fieldset": { border: "none" },
    "&.Mui-focused fieldset": { border: "1px solid #E0E0E0" },
  },
  "& .MuiInputLabel-root": { fontSize: "13px", color: "#777777", fontWeight: 500 },
  "& .MuiInputLabel-shrink": { color: "#555555" },
};

export default function ContactsModal({ open, onClose, ownerAddress }: ContactsModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState({ name: "", wallet_address: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!ownerAddress) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?owner_address=${ownerAddress}`);
      const json = await res.json();
      if (json.success) setContacts(json.data);
    } catch {
      // table may not exist yet or network error — silently ignore
    } finally {
      setLoading(false);
    }
  }, [ownerAddress]);

  useEffect(() => {
    if (open) fetchContacts();
  }, [open, fetchContacts]);

  async function handleAdd() {
    setError(null);
    if (!form.name.trim() || !form.wallet_address.trim()) {
      setError("Both fields are required.");
      return;
    }
    if (!ethers.isAddress(form.wallet_address)) {
      setError("Invalid wallet address.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: ownerAddress,
        name: form.name.trim(),
        wallet_address: form.wallet_address.trim(),
      }),
    });
    const json = await res.json();
    if (json.success) {
      setForm({ name: "", wallet_address: "" });
      await fetchContacts();
    } else {
      setError(json.error || "Failed to save contact.");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
          border: "1px solid #F0F0F0",
          width: "480px",
          maxWidth: "480px",
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: "48px !important" }}>
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "26px", letterSpacing: "-0.5px", color: "#000000", fontFamily: "inherit" }}>
            Contacts
          </Typography>
          <Typography sx={{ fontSize: "15px", color: "#777777", fontFamily: "inherit", mt: 0.5 }}>
            Save seller names and addresses for quick reuse.
          </Typography>
        </Box>

        {/* Add new contact */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
          <TextField
            label="Name"
            placeholder="Acme Inc."
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            disabled={saving}
          />
          <TextField
            label="Wallet Address"
            placeholder="0x..."
            fullWidth
            variant="outlined"
            sx={inputSx}
            value={form.wallet_address}
            onChange={(e) => setForm((p) => ({ ...p, wallet_address: e.target.value }))}
            disabled={saving}
          />
          {error && (
            <Typography sx={{ fontSize: "13px", color: "#d32f2f", fontFamily: "inherit" }}>
              {error}
            </Typography>
          )}
          <Button
            fullWidth
            onClick={handleAdd}
            disabled={saving}
            sx={{
              backgroundColor: "#171717",
              color: "#FFFFFF",
              borderRadius: "10px",
              py: 1.5,
              textTransform: "none",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "inherit",
              "&:hover": { backgroundColor: "#2a2a2a" },
              "&.Mui-disabled": { backgroundColor: "#999999", color: "#ffffff" },
            }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Add Contact"}
          </Button>
        </Box>

        {/* Contact list */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={20} sx={{ color: "#999" }} />
            </Box>
          ) : contacts.length === 0 ? (
            <Typography sx={{ fontSize: "14px", color: "#999999", fontFamily: "inherit" }}>
              No contacts yet.
            </Typography>
          ) : (
            contacts.map((contact) => (
              <Box
                key={contact.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#F5F5F5",
                  borderRadius: "10px",
                  px: 2,
                  py: 1.5,
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#000", fontFamily: "inherit" }}>
                    {contact.name}
                  </Typography>
                  <Typography sx={{ fontSize: "12px", color: "#777", fontFamily: "inherit", mt: 0.25 }}>
                    {contact.wallet_address.slice(0, 6)}…{contact.wallet_address.slice(-4)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(contact.id)}
                  sx={{ color: "#999", "&:hover": { color: "#d32f2f" } }}
                >
                  ×
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
