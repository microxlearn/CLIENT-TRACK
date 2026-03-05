# **App Name**: ClientTrack

## Core Features:

- Secure Staff Authentication: Implement robust Email/Password login, validating staff credentials against Firebase Authentication and Firestore admin documents, including 'is_active' status and assigned roles for access control.
- Admin User Management: A dedicated module for super-admins to create, view, edit, and delete other administrative user accounts, enforcing strict role-based access rules.
- Client Enrollment & Management: Streamlined interface for adding new clients, with automated fee calculation based on market type, initial payment record creation, and comprehensive client detail management.
- Dynamic Dashboard Analytics: A live dashboard displaying key performance indicators (KPIs) such as total clients, market-specific client counts, pending payments, and subscriptions expiring soon.
- Payment History & Tracking: View and record all client payment events, including amounts, payment dates, and updates to subscription validity, offering a comprehensive financial activity log.
- Soft Deletion & Recovery System: Allows 'soft' deletion of client records, moving them to a 'Recycle Bin' view for recovery, enhancing data integrity and preventing accidental data loss.
- Personalized WhatsApp Message Generator: A utility for staff to generate pre-filled WhatsApp messages for clients by automatically populating template variables with client-specific data such as name, market, fee, and expiry date.

## Style Guidelines:

- Primary color: A sophisticated, deep violet-blue (#3D3D7A) to convey professionalism and reliability, used for key interactive elements and branding.
- Background color: A very light, subtly tinted off-white (#F3F3F5), providing a clean, airy canvas that ensures high readability and a clear visual hierarchy.
- Accent color: A vibrant, clear sky blue (#31B2F5) to draw attention to critical actions, calls-to-action, and highlights, offering excellent contrast against the primary and background hues.
- Primary font: 'Inter' (sans-serif), chosen for its modern, clean lines, optimal readability on digital screens, and versatility across both headlines and body text within the data-rich portal.
- Use a cohesive set of minimalist, vector-based line icons to represent actions and modules. Icons should be clear, intuitive, and scalable for mobile-first responsiveness.
- A single-page application structure prioritizing a mobile-first responsive design, with all content loading dynamically within a main container. A fixed top header provides branding, while a clear bottom navigation bar ensures easy access to primary modules (Dashboard, Payments, History, Admins, Settings).
- Subtle and swift animations for content transitions and state changes to ensure a smooth, modern user experience. Feedback to user actions is provided via transient floating toast notifications for success, error, and warning messages, featuring gentle fade effects.