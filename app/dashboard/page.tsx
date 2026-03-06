"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { getUserByWalletAddress } from "@/lib/api/users";
import { useEffect } from "react";

export default function Dashboard() {
  const router = useRouter();
  const { authenticated, user: hookUser } = usePrivy();

  const handleRoleRouting = async (walletAddress?: string) => {
    if (!walletAddress) {
      router.push("/dashboard");
      return;
    }

    try {
      const currentUser = await getUserByWalletAddress(walletAddress);

      if (currentUser?.type === "buyer") {
        router.push("/payments/buyer");
      } else if (currentUser?.type === "seller") {
        router.push("/payments/seller");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    if (authenticated && hookUser?.wallet?.address) {
      handleRoleRouting(hookUser.wallet.address);
    }
  }, [authenticated, hookUser?.wallet?.address]);
}
