# ImpactfulPitch.com Website

This is the official repository for the ImpactfulPitch.com website, a platform dedicated to helping entrepreneurs and businesses create compelling pitches to secure funding and partnerships.

## Description

This project is a modern, responsive, and performant web application built with Next.js and deployed on Vercel. It showcases the services offered by ImpactfulPitch, success stories, client testimonials, and provides resources for startups. The backend is powered by Convex, providing a real-time database and serverless functions.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v20 or later)
- pnpm (or npm/yarn)

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/ManthanK19/impactfulpitch.com.git
    ```
2.  Install NPM packages
    ```sh
    pnpm install
    ```
3.  Set up Convex
    - Follow the instructions at [https://docs.convex.dev/getting-started](https://docs.convex.dev/getting-started) to set up your Convex backend.

### Running the Application

To run the application in development mode, use:

```sh
pnpm dev
```

This will start the development server at `http://localhost:3000`.

## Available Scripts

In the project directory, you can run the following scripts:

-   `pnpm dev`: Runs the app in development mode with Turbopack.
-   `pnpm build`: Builds the app for production.
-   `pnpm start`: Starts the production server.
-   `pnpm lint`: Lints the code using Next.js's built-in ESLint configuration.
-   `pnpm format`: Formats the code with Prettier.
-   `pnpm sitemap`: Generates a `sitemap.xml` file.

## Technologies Used

-   **Frontend:**
    -   [Next.js](https://nextjs.org/) - React Framework
    -   [React](https://reactjs.org/) - JavaScript Library
    -   [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
    -   [Framer Motion](https://www.framer.com/motion/) - Animation Library
-   **Backend:**
    -   [Convex](https://www.convex.dev/) - Real-time Database and Serverless Functions
-   **Deployment:**
    -   [Vercel](https://vercel.com/)

## Folder Structure

The project follows a standard Next.js `app` directory structure with some additions:

```
.
├── app/                  # Next.js App Router pages
├── convex/               # Convex backend functions and schema
├── public/               # Static assets (images, fonts, etc.)
├── src/                  # Source code for components and pages
│   ├── components/       # Shared React components
│   ├── home/             # Components specific to the homepage
│   └── ...
├── scripts/              # Node.js scripts (e.g., sitemap generation)
└── ...
```

## Deployment

The application is deployed on [Vercel](https://vercel.com/). The Vercel platform is configured to automatically build and deploy the `main` branch.
