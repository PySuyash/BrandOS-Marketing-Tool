# BrandOS --- AI-Powered Brand Governance Platform

BrandOS helps organisations review content against their approved brand
guidelines before publication. It combines predefined rule-based checks
with AI-assisted analysis and a human review workflow, helping teams
identify potential brand inconsistencies and make informed corrections.

**Live application:** https://brandos-gpjl.onrender.com/login\
**Source code:** https://github.com/PySuyash/BrandOS-Marketing-Tool

## Problem

When content is created by different employees, teams, agencies or AI
tools, maintaining a consistent brand identity becomes difficult.
Outdated facts, inconsistent terminology, unsupported claims and
off-brand messaging can affect an organisation's credibility.

BrandOS brings brand knowledge and content review into one platform so
that submitted content can be checked before it is approved.

## Key Features

-   **User authentication and roles:** Access for Admin, Creator and
    Reviewer/Manager roles.
-   **Content submission:** Submit text and upload supported document
    formats for review.
-   **Hybrid content validation:** Combines predefined rule-based checks
    with Google Gemini AI-assisted analysis.
-   **Explainable findings:** Displays problematic content, the relevant
    brand rule and a severity level.
-   **Suggested corrections:** Helps users address identified content
    issues.
-   **Human review and approval:** Reviewers can approve, reject or
    request revisions.
-   **Brand Knowledge Base:** Manage brand guidelines, voice rules,
    terminology and approved facts.
-   **Organisation and department-level knowledge:** Keep brand
    information organised for different organisations and departments.
-   **Collaboration and traceability:** Comments, revision history,
    approval/rejection history and audit logs.
-   **Dashboard and reports:** View submission history and basic
    dashboard statistics, and download reports and compliance summaries.

## Technology Stack

  Layer                        Technologies
  ---------------------------- ---------------------------------
  Frontend                     React.js, JavaScript, Vite
  UI and styling               Tailwind CSS, shadcn/ui
  Frontend routing and state   React Router, React Context API
  HTTP requests                Axios
  Backend                      Node.js, Express.js
  Database                     Supabase PostgreSQL
  Authentication               Supabase Auth
  AI integration               Google Gemini API
  Deployment                   Render

## How It Works

1.  **Configure brand knowledge:** An administrator adds the
    organisation's approved guidelines, brand voice rules, terminology
    and facts.
2.  **Submit content:** A creator submits text or an accepted document
    for review.
3.  **Validate content:** BrandOS applies rule-based checks and
    Gemini-assisted analysis.
4.  **Review findings:** The application presents identified issues,
    relevant rules, explanations and severity levels, along with
    suggested corrections.
5.  **Human decision:** A reviewer can approve the content, reject it or
    send it back for revision.
6.  **Track changes:** Comments, revisions and review actions help
    maintain a history of the content review process.

AI-assisted findings are intended to support human decision-making; the
review and approval workflow remains human-controlled.

## Supported Content Inputs

The application currently supports:

-   Text entered in the content editor
-   PDF
-   DOCX
-   TXT
-   XLSX
-   PPTX

## Local Development

The exact folder layout and npm scripts should be taken from the
repository's current `package.json` files. The general setup is:

### Prerequisites

-   Node.js and npm
-   A Supabase project
-   A Google Gemini API key

### Setup

1.  Clone the repository:

    ``` bash
    git clone https://github.com/PySuyash/BrandOS-Marketing-Tool.git
    cd BrandOS-Marketing-Tool
    ```

2.  Install dependencies in the frontend and backend directories:

    ``` bash
    npm install
    ```

    Run this in each application directory that contains its own
    `package.json`.

3.  Configure the environment variables expected by the application.
    These will typically include the Supabase project URL and required
    Supabase key, the Gemini API key, and any backend/frontend API URL
    settings. **Use the exact variable names expected by the source
    code**; they may differ between deployments.

4.  Start the backend and frontend using the development scripts defined
    in their respective `package.json` files.

> **Note:** The repository's exact directory names, environment-variable
> names and npm scripts have not been verified for this README. Check
> the project source and its `package.json` files before following the
> local setup commands. Do not commit API keys, database credentials or
> other secrets.

## Current Limitations

The core content submission, validation and human review workflows are
functional. The following capabilities are incomplete or not currently
available:

-   Visual brand analysis, accessibility checks and cross-channel
    consistency checks are partially implemented.
-   Content Trust Passport and Brand Drift Radar are planned, not yet
    implemented.
-   Advanced compliance analytics and automatic detection of outdated
    approved content are not complete.
-   Google sign-in and external integrations such as Google Docs, Figma,
    Slack and social platforms are not available.
-   The application currently supports English only.
-   Large uploads do not have a dedicated background-processing
    workflow.
-   Automated testing and validation-accuracy evaluation using a
    labelled dataset have not yet been completed.
-   Formal external user testing and documented external feedback have
    not yet been conducted.

## Roadmap

The next development phase focuses on three substantial improvements:

1.  **Evidence-Backed AI Verification & Content Trust Passport** ---
    improve validation quality, connect findings to supporting brand
    evidence, evaluate results with labelled test data and provide a
    traceable record for each reviewed content version.
2.  **Proactive Brand Intelligence --- Brand Drift Radar** --- identify
    previously approved content that may have become outdated after
    brand guidelines or approved facts change, and surface recurring
    compliance issues.
3.  **Multimodal Brand & Accessibility Intelligence** --- deepen visual
    brand checks for logos, colours, typography and layouts, while
    improving accessibility and cross-channel consistency analysis.

These are planned improvements and should not be considered existing
product capabilities.

## Team

**Team Groot --- CodeZen India 2026**

-   **Suyash** --- Development Team Lead
-   **Divyansh Singh** --- Product Architect & AI/ML Developer
-   **Arjit Singh** --- Research & Management Lead
-   **Sujal Modanwal** --- Research, Planning, Management & Coordination

## Project Links

-   Live application: https://brandos-gpjl.onrender.com/login
-   GitHub repository:
    https://github.com/PySuyash/BrandOS-Marketing-Tool

------------------------------------------------------------------------

BrandOS is designed to make brand governance more consistent and
explainable while keeping people in control of final content decisions.
