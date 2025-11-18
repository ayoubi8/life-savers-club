# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/646f29fe-2607-4f8f-a0e4-1dbe77ab33d3

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/646f29fe-2607-4f8f-a0e4-1dbe77ab33d3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

## Admin Access

To create an admin account, you first need to create a regular user account. After that, an existing admin must promote the new user to the admin role. There is no public link to directly create an admin account for security reasons.

To log in, you can use the `/auth` page. This will allow you to sign in with an existing account. Once you are logged in, if you have admin privileges, you can access the admin dashboard at `/admin`.

The admin role has full permissions to manage the application's data. This includes the ability to create, read, update, and delete articles, events, sponsors, and user submissions.

---

## Progress Log

### Previous Session

**Summary:** We successfully debugged and fixed the event creation workflow. The primary issues were related to Supabase configuration and data consistency between the front-end application and the back-end database.

**Key Accomplishments:**

1.  **Fixed Supabase Storage Image Uploads:**
    *   Diagnosed and resolved a `400 Bad Request` / `404 Bucket not found` error during image uploads.
    *   Created the `event-media` public bucket in the Supabase Storage dashboard.
    *   Wrote and applied a complete and correct set of Row Level Security (RLS) policies for both `storage.buckets` and `storage.objects` to allow authenticated users to view the bucket and upload/manage their own files.

2.  **Fixed Event Saving Logic:**
    *   Addressed a `400 Bad Request` error that occurred when saving a new event.
    *   Updated the `EventEditor.tsx` component to require a user to select an `event_date` before saving, preventing the app from sending null data for a required database column.
    *   Corrected a data mismatch by removing the non-existent `videos` field from the data payload sent to the `events` table, aligning the front-end with the actual database schema.

---

### Current Session Summary

During this session, we addressed several key issues to improve the application's stability, security, and functionality.

1.  **Enabled Public Commenting:** We modified the `EventDetailPage.tsx` file to allow all users, including those who are not logged in, to post comments on events. Comments now appear instantly for everyone.

2.  **Corrected Database Schema Errors:**
    *   Added the missing `category` column to the `events` table to fix an error that occurred when trying to save an event's category.
    *   Created the `comments` table and established a proper foreign key relationship to the `events` table. This resolved the "Could not find a relationship" error and ensures data integrity.

3.  **Fixed the Event Editor:** We corrected the `EventEditor.tsx` file to properly fetch and load existing event details (title, description, date, and images) into the form, allowing administrators to see and edit the information.

4.  **Implemented Role-Based Access Control (RBAC):** We performed a major overhaul of the user roles and permissions in your Supabase database.
    *   **Defined Roles:** We standardized the user roles to `root`, `admin`, and `editor`.
    *   **Established Permissions:** We implemented a comprehensive set of Row Level Security policies and SQL functions to enforce strict access rules:
        *   **Root:** Has full control over all data, including the ability to manage user roles.
        *   **Admin:** Can manage events and other content but cannot change user roles.
        *   **Editor:** Can create, edit, and view events but cannot manage other users or site settings.
        *   **Public:** Can view events and comments but has no editing privileges.
