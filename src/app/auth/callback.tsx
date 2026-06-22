import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { getSupabase } from "@/lib/supabase";

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState("Finishing Google sign-in...");

  useEffect(() => {
    let mounted = true;

    async function finishCallback() {
      try {
        const supabase = getSupabase();

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!session) {
          if (mounted) {
            setMessage("Google sign-in finished. Returning to the app...");
          }

          setTimeout(() => {
            router.replace("/auth");
          }, 700);

          return;
        }

        if (mounted) {
          setMessage("Signed in successfully.");
        }

        setTimeout(() => {
          router.replace("/recipes");
        }, 300);
      } catch {
        if (mounted) {
          setMessage(
            "Could not complete Google sign-in. Please go back and try again.",
          );
        }
      }
    }

    finishCallback();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#FAF4EA",
      }}
    >
      <ActivityIndicator color="#556B45" />

      <Text
        style={{
          marginTop: 16,
          textAlign: "center",
          color: "#2A241F",
          fontSize: 16,
          fontWeight: "600",
          lineHeight: 22,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
