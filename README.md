# XeyConnect Hire - Recruitment Management System

A comprehensive workflow-based recruitment management system built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

### Master Data Management
- **Users Management**: Create and manage users with roles and designations
- **Interview Panels**: Set up interview panels with multiple users and availability calendars
- **Panel Availability**: Schedule time slots for interview panels

### Hiring Campaign Management
- **Campaign Setup**: Create hiring campaigns with job descriptions and position counts
- **Campaign Status**: Manage active/inactive campaigns
- **File Uploads**: Support for job description attachments

### Application Management
- **Public Apply Portal**: Candidates can apply for positions online
- **Application Repository**: Review and manage applications by campaign
- **Resume Management**: Upload and preview candidate resumes
- **Shortlist/Reject**: Review applications and move candidates forward

### Workflow Management
- **Multi-stage Process**: Comprehensive hiring workflow with multiple stages
- **Interview Scheduling**: Assign panels and schedule interviews
- **Technical Testing**: Upload test papers and answer sheets
- **Review Process**: Multiple reviewers for technical assessments
- **Onboarding**: Final stage with completion tracking

### Workflow Stages
1. **Interview 1 - Setup**: Assign panel and schedule first interview
2. **Interview 1**: Conduct interview and record results
3. **Technical Test - Setup**: Upload test papers and schedule
4. **Technical Test - Review**: Upload answers and assign reviewers
5. **Onboarding**: Background checks and offer letter release
6. **Completion**: Final stage marking

## Technology Stack

- **Frontend**: React 18, Material-UI, React Router, React Query
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **File Upload**: Multer for handling file uploads
- **Authentication**: JWT-based authentication
- **Deployment**: Docker & Docker Compose

## Prerequisites

- Node.js 18+
- MongoDB 7.0+
- Docker (optional, for containerized deployment)

## Installation & Setup

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd xeyconnect-hire
   ```

2. **Install dependencies**
   ```bash
   npm run install-deps
   ```

3. **Setup MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Create a database named `xeyconnect_hire`

4. **Configure environment variables**
   ```bash
   # Backend (.env file in backend folder)
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/xeyconnect_hire
   JWT_SECRET=your-super-secret-jwt-key
   ```

5. **Start the application**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start separately:
   npm run server  # Backend only
   npm run client  # Frontend only
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Apply Portal: http://localhost:3000/apply

### Option 2: Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

## Usage

### Getting Started

1. **Register the first user**
   - Visit http://localhost:3000/register
   - Create an admin user account

2. **Set up master data**
   - Create users for your organization
   - Set up interview panels
   - Create hiring campaigns

3. **Manage applications**
   - Candidates apply through the public portal
   - Review applications in the Repository section
   - Shortlist candidates to start workflows

4. **Manage workflows**
   - Track candidate progress in Activities
   - Complete each stage of the hiring process
   - Monitor upcoming interviews and tasks

### User Roles & Permissions

Currently, the system does not implement role-based access control as specified in the requirements. All authenticated users have full access to all features.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Panels
- `GET /api/panels` - Get all panels
- `POST /api/panels` - Create panel
- `PUT /api/panels/:id` - Update panel
- `POST /api/panels/:id/availability` - Add availability
- `DELETE /api/panels/:id` - Delete panel

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Applications
- `POST /api/applications/apply` - Submit application (public)
- `GET /api/applications` - Get all applications
- `GET /api/applications/campaign/:id` - Get applications by campaign
- `PUT /api/applications/:id/review` - Review application

### Workflows
- `GET /api/workflows` - Get all workflows
- `GET /api/workflows/:id` - Get workflow by ID
- `PUT /api/workflows/:id/interview1-setup` - Setup first interview
- `PUT /api/workflows/:id/interview1-result` - Record interview result
- `PUT /api/workflows/:id/technical-test-setup` - Setup technical test
- `PUT /api/workflows/:id/technical-test-submit` - Submit test answers
- `PUT /api/workflows/:id/technical-test-result` - Review test results
- `PUT /api/workflows/:id/candidate-details` - Update candidate details
- `PUT /api/workflows/:id/onboarding` - Manage onboarding

## File Structure

```
xeyconnect-hire/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & upload middleware
│   ├── uploads/         # File storage
│   ├── server.js        # Express server
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── services/    # API services
│   │   └── App.js
│   ├── public/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
