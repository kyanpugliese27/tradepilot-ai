"use client";

import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";

export default function ResponsiveSidebar() {
  return (
    <>
      <div className="norvexa-desktop-sidebar">
        <Sidebar />
      </div>

      <div className="norvexa-mobile-sidebar">
        <MobileSidebar />
      </div>

      <style jsx global>{`
        .norvexa-desktop-sidebar {
          display: block;
        }

        .norvexa-mobile-sidebar {
          display: none;
        }

        @media (max-width: 900px) {
          .norvexa-desktop-sidebar {
            display: none !important;
          }

          .norvexa-mobile-sidebar {
            display: block;
          }
        }
      `}</style>
    </>
  );
}