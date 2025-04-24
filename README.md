# Workfront API Explorer

A React application for exploring Workfront API data. This application allows users to view and interact with Projects, Tasks, and Issues from the Workfront API.

## Features

- View Projects, Tasks, and Issues from Workfront
- Interactive data tables with sorting and filtering
- Real-time data fetching
- Modern UI using Adobe React Spectrum components

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Workfront API credentials

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with your Workfront API credentials:
   ```
   VITE_WORKFRONT_API_KEY=your_api_key
   VITE_WORKFRONT_DOMAIN=your_domain
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Select an object type (Projects, Tasks, or Issues) from the dropdown
2. View the data in the interactive table
3. Use the table features to sort and filter the data

## Technologies Used

- React
- TypeScript
- Adobe React Spectrum
- Vite
- Express.js
- Chart.js

## License

This project is licensed under the MIT License. 