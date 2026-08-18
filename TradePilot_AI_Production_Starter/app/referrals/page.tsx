"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReferralRow = {
  id: string;
  referral_code: string;
  created_at: string;
};

export default function ReferralsPage() {
  const [code, setCode] = useState("");
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReferralData();
  }, []);

  async function loadReferralData() {
    const supabase = createClient();

    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: codeRow, error: codeError } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (codeError) throw codeError;
      if (!codeRow?.code) throw new Error("No referral code found.");

      setCode(codeRow.code);

      const { data: referralRows, error: referralError } = await supabase
        .from("referrals")
        .select("id, referral_code, created_at")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (referralError) throw referralError;

      setReferrals((referralRows || []) as ReferralRow[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load referrals."
      );
    } finally {
      setLoading(false);
    }
  }

  const referralLink = useMemo(() => {
    if (!code || typeof window === "undefined") return "";
    return `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`;
  }, [code]);

  async function copyLink() {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy referral link.");
    }
  }

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={topBarStyle}>
          <Link href="/dashboard" style={backLinkStyle}>
            ← Back to Dashboard
          </Link>

          <span style={badgeStyle}>👥 Referrals</span>
        </div>

        <p style={eyebrowStyle}>Norvexa growth</p>
        <h1 style={titleStyle}>Invite Friends</h1>
        <p style={subtitleStyle}>
          Share your personal Norvexa link. New users who join through it
          will be connected to your referral account.
        </p>

        {error && <div style={errorStyle}>{error}</div>}

        {loading ? (
          <div style={loadingStyle}>Loading your referral account...</div>
        ) : (
          <>
            <section style={heroCardStyle}>
              <p style={labelStyle}>YOUR REFERRAL CODE</p>
              <div style={codeStyle}>{code}</div>

              <p style={{ ...labelStyle, marginTop: 22 }}>
                YOUR PERSONAL LINK
              </p>

              <div style={linkRowStyle}>
                <div style={linkBoxStyle}>{referralLink}</div>

                <button type="button" onClick={copyLink} style={copyButtonStyle}>
                  {copied ? "✓ Copied" : "Copy Link"}
                </button>
              </div>
            </section>

            <div style={statsGridStyle}>
              <article style={statCardStyle}>
                <span style={labelStyle}>TOTAL REFERRALS</span>
                <strong style={statValueStyle}>{referrals.length}</strong>
              </article>

              <article style={statCardStyle}>
                <span style={labelStyle}>REFERRAL CODE</span>
                <strong style={statValueStyle}>{code}</strong>
              </article>
            </div>

            <section style={sectionStyle}>
              <div style={sectionHeaderStyle}>
                <div>
                  <p style={eyebrowStyle}>Activity</p>
                  <h2 style={{ margin: 0 }}>Your Referrals</h2>
                </div>

                <button
                  type="button"
                  onClick={loadReferralData}
                  style={refreshButtonStyle}
                >
                  ↻ Refresh
                </button>
              </div>

              {referrals.length === 0 ? (
                <div style={emptyStyle}>
                  <div style={{ fontSize: 30 }}>👥</div>
                  <h3 style={{ margin: "10px 0 0" }}>No referrals yet</h3>
                  <p style={emptyTextStyle}>
                    Share your link. Successful referrals will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={tableHeadStyle}>Referral</th>
                        <th style={tableHeadStyle}>Code Used</th>
                        <th style={tableHeadStyle}>Joined</th>
                      </tr>
                    </thead>

                    <tbody>
                      {referrals.map((referral, index) => (
                        <tr key={referral.id} style={rowStyle}>
                          <td style={tableCellStyle}>
                            Referral #{referrals.length - index}
                          </td>
                          <td style={tableCellStyle}>{referral.referral_code}</td>
                          <td style={tableCellStyle}>
                            {new Date(referral.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "#07111f",
  color: "white",
};

const containerStyle = {
  maxWidth: 1050,
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 28,
};

const backLinkStyle = {
  padding: "9px 13px",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 9,
  color: "#d1d5db",
  textDecoration: "none",
};

const badgeStyle = {
  padding: "7px 10px",
  border: "1px solid rgba(96,165,250,0.18)",
  borderRadius: 999,
  background: "rgba(37,99,235,0.06)",
  color: "#93c5fd",
  fontSize: 9,
  fontWeight: 850,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: 43,
};

const subtitleStyle = {
  maxWidth: 700,
  margin: "10px 0 0",
  color: "#9ca3af",
  lineHeight: 1.65,
};

const heroCardStyle = {
  marginTop: 26,
  padding: 24,
  border: "1px solid rgba(96,165,250,0.18)",
  borderRadius: 17,
  background: "rgba(37,99,235,0.07)",
};

const labelStyle = {
  display: "block",
  color: "#6b7280",
  fontSize: 9,
  fontWeight: 850,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const codeStyle = {
  marginTop: 8,
  color: "#93c5fd",
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const linkRowStyle = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap" as const,
  marginTop: 8,
};

const linkBoxStyle = {
  flex: 1,
  minWidth: 250,
  padding: "11px 12px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontSize: 11,
  overflowWrap: "anywhere" as const,
};

const copyButtonStyle = {
  padding: "11px 14px",
  border: "none",
  borderRadius: 10,
  background: "#2563eb",
  color: "white",
  fontSize: 11,
  fontWeight: 850,
  cursor: "pointer",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginTop: 14,
};

const statCardStyle = {
  padding: 17,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 13,
  background: "rgba(255,255,255,0.025)",
};

const statValueStyle = {
  display: "block",
  marginTop: 7,
  fontSize: 23,
};

const sectionStyle = {
  marginTop: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 15,
  background: "rgba(255,255,255,0.025)",
  overflow: "hidden",
};

const sectionHeaderStyle = {
  padding: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  borderBottom: "1px solid rgba(255,255,255,0.07)",
};

const refreshButtonStyle = {
  padding: "8px 11px",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 9,
  background: "rgba(255,255,255,0.025)",
  color: "#d1d5db",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const tableStyle = {
  width: "100%",
  minWidth: 620,
  borderCollapse: "collapse" as const,
};

const tableHeadStyle = {
  padding: "11px 15px",
  textAlign: "left" as const,
  color: "#6b7280",
  fontSize: 9,
  fontWeight: 850,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
};

const tableCellStyle = {
  padding: "14px 15px",
  color: "#d1d5db",
  fontSize: 11,
};

const rowStyle = {
  borderTop: "1px solid rgba(255,255,255,0.06)",
};

const loadingStyle = {
  marginTop: 25,
  padding: 30,
  textAlign: "center" as const,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  color: "#9ca3af",
};

const emptyStyle = {
  padding: "42px 22px",
  textAlign: "center" as const,
};

const emptyTextStyle = {
  maxWidth: 480,
  margin: "8px auto 0",
  color: "#9ca3af",
  fontSize: 11,
};

const errorStyle = {
  marginTop: 15,
  padding: 13,
  border: "1px solid rgba(239,68,68,0.25)",
  borderRadius: 10,
  background: "rgba(239,68,68,0.08)",
  color: "#ff8a8a",
};