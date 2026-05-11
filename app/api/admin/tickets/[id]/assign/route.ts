// app/api/admin/tickets/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TicketEventListeners } from "@/lib/listeners/ticket-listeners";
import { NotificationService } from "@/lib/notifications/notification.service";

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

// Email template for ticket assignment notification to customer
const customerAssignmentTemplate = {
  subject: "🎫 Good News! Your Support Ticket #{{TICKET_NUMBER}} Has Been Assigned",
  body: `Dear {{CUSTOMER_NAME}},

Great news! Your support ticket regarding "{{ISSUE_SUMMARY}}" has been assigned to a support specialist.

**Ticket Details:**
- **Ticket ID:** {{TICKET_NUMBER}}
- **Issue:** {{ISSUE_SUMMARY}}
- **Priority:** {{PRIORITY_LEVEL}}
- **Assigned To:** {{AGENT_NAME}}

**What happens next?**
Our support specialist {{AGENT_NAME}} will review your ticket and respond within {{RESPONSE_TIME}}. You can expect:

1. **Initial Response:** Within {{RESPONSE_TIME}} hours
2. **Resolution Update:** You'll receive updates as we make progress
3. **Direct Communication:** Our agent may reach out for additional details

**Track Your Ticket:**
You can check the status of your ticket anytime by visiting:
{{TICKET_TRACKING_LINK}}

**Need to add something?**
Simply reply to this email with any additional information, screenshots, or details. Your response will be automatically attached to your existing ticket.

**Response Time Commitment:**
- Urgent: 4 hours
- High: 8 hours  
- Medium: 24 hours
- Low: 48 hours

Thank you for choosing {{COMPANY_NAME}}. We're committed to resolving your issue quickly and effectively.

Best regards,
{{SUPPORT_TEAM_NAME}}
{{COMPANY_NAME}}
Support Email: {{SUPPORT_EMAIL}}
Support Phone: {{SUPPORT_PHONE}}`,
};

// Template for the assigned agent notification
const agentAssignmentTemplate = {
  subject: "New Ticket Assignment: #{{TICKET_NUMBER}} - {{ISSUE_SUMMARY}}",
  body: `Hello {{AGENT_NAME}},

A new support ticket has been assigned to you.

**Ticket Details:**
- **Ticket ID:** #{{TICKET_NUMBER}}
- **Customer:** {{CUSTOMER_NAME}} ({{CUSTOMER_EMAIL}})
- **Issue:** {{ISSUE_SUMMARY}}
- **Priority:** {{PRIORITY_LEVEL}}
- **Status:** {{TICKET_STATUS}}

**Customer Message:**
{{CUSTOMER_MESSAGE}}

**Required Actions:**
1. Review the customer's issue within the next {{RESPONSE_TIME}} hours
2. Respond to the customer with initial assessment
3. Update ticket status as you make progress

**Quick Actions:**
- View Ticket: {{TICKET_LINK}}
- Reply to Customer: {{REPLY_LINK}}

Thank you for your dedication to customer satisfaction.

Best regards,
{{COMPANY_NAME}} Support Team`,
};

// In-app notification template for customer
const customerInAppNotification = {
  title: "✅ Ticket Assigned",
  message: "Your ticket #{{TICKET_NUMBER}} has been assigned to {{AGENT_NAME}}. They'll respond shortly.",
};

// In-app notification template for agent
const agentInAppNotification = {
  title: "📋 New Ticket Assignment",
  message: "Ticket #{{TICKET_NUMBER}} has been assigned to you. Priority: {{PRIORITY_LEVEL}}",
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { assignedTo } = await req.json();
    const ticketId = params.id;
    
    // Fetch ticket with all necessary relations before update
    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id: ticketId, },
      include: {
        user: true,
        assignments: true,
      },
    });
    
    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    
    // Update ticket
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { 
        assignedTo: assignedTo || null, 
        ...(assignedTo ? { status: "IN_PROGRESS" } : {}),
        ...(assignedTo && !existingTicket.assignedTo ? { assignedAt: new Date() } : {}),
      },
      include: {
        user: true,
        assignments: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket update failed" }, { status: 500 });
    }
    
    const assignment = await prisma.ticketAssignment.create({
      data: {
        ticketId,
        agentId: assignedTo || null,
        assignedAt: new Date(),
        assignedBy: session.user.id,
        assignmentType: existingTicket.status === "IN_PROGRESS" ? "REASSIGNMENT" : "MANUAL",
      },
    });

    // Get assigned agent details if assignment happened
    let assignedAgent = null;
    if (assignedTo) {
      assignedAgent = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true, name: true, email: true },
      });
    }

    // Send notifications if ticket was assigned
    if (assignedTo && assignedAgent && assignment) {
      // Call the existing listener
      await TicketEventListeners.onTicketAssigned(ticketId, assignedTo, session.user.id);
      
      // Prepare common variables
      const companyName = process.env.COMPANY_NAME || "Mvalex Business Suite";
      const supportEmail = process.env.SUPPORT_EMAIL || "support@mvalex.com";
      const supportPhone = process.env.SUPPORT_PHONE || "+86 21 8888 8888";
      const supportTeamName = process.env.SUPPORT_TEAM_NAME || "Customer Support Team";
      const baseUrl = process.env.NEXTAUTH_URL || "https://mvalex.com";
      
      // Determine response time based on priority
      const responseTimeMap: Record<string, string> = {
        URGENT: "4 hours",
        HIGH: "8 hours",
        MEDIUM: "24 hours",
        LOW: "48 hours",
      };
      const responseTime = responseTimeMap[existingTicket.priority] || "24 hours";
      
      // Prepare variables for customer notification
      const customerVariables = {
        CUSTOMER_NAME: existingTicket.user.name || "Valued Customer",
        CUSTOMER_EMAIL: existingTicket.user.email,
        TICKET_NUMBER: ticketId.slice(0, 8).toUpperCase(),
        ISSUE_SUMMARY: existingTicket.subject.length > 60 
          ? existingTicket.subject.substring(0, 60) + "..." 
          : existingTicket.subject,
        ISSUE_DESCRIPTION: existingTicket.description.substring(0, 200),
        PRIORITY_LEVEL: existingTicket.priority,
        AGENT_NAME: assignedAgent.name || "Support Specialist",
        RESPONSE_TIME: responseTime,
        TICKET_TRACKING_LINK: `${baseUrl}/support/tickets/${ticketId}`,
        COMPANY_NAME: companyName,
        SUPPORT_TEAM_NAME: supportTeamName,
        SUPPORT_EMAIL: supportEmail,
        SUPPORT_PHONE: supportPhone,
        SUBMISSION_DATE: new Date(existingTicket.createdAt).toLocaleString(),
      };
      
      // Prepare variables for agent notification
      const agentVariables = {
        AGENT_NAME: assignedAgent.name || "Support Specialist",
        TICKET_NUMBER: ticketId.slice(0, 8).toUpperCase(),
        CUSTOMER_NAME: existingTicket.user.name || "Valued Customer",
        CUSTOMER_EMAIL: existingTicket.user.email,
        ISSUE_SUMMARY: existingTicket.subject,
        CUSTOMER_MESSAGE: existingTicket.description,
        PRIORITY_LEVEL: existingTicket.priority,
        TICKET_STATUS: ticket.status,
        RESPONSE_TIME: responseTime,
        TICKET_LINK: `${baseUrl}/admin/tickets/${ticketId}`,
        REPLY_LINK: `${baseUrl}/admin/tickets/${ticketId}/respond`,
        COMPANY_NAME: companyName,
      };
      
      // Send email notification to customer
      try {
        await NotificationService.sendEmail(
          existingTicket.user.id,
          replaceTemplateVariables(customerAssignmentTemplate.subject, customerVariables),
          replaceTemplateVariables(customerAssignmentTemplate.body, customerVariables)
        );
        
      } catch (emailError) {
        console.error("Failed to send assignment notification email to customer:", emailError);
        // Don't fail the whole operation if email fails
      }
      
      // Send in-app notification to customer
      try {
        await NotificationService.send({
          userId: existingTicket.user.id,
          title: replaceTemplateVariables(customerInAppNotification.title, {
            TICKET_NUMBER: customerVariables.TICKET_NUMBER,
            AGENT_NAME: customerVariables.AGENT_NAME,
          }),
          message: replaceTemplateVariables(customerInAppNotification.message, {
            TICKET_NUMBER: customerVariables.TICKET_NUMBER,
            AGENT_NAME: customerVariables.AGENT_NAME,
          }),
          type: "TICKET_ASSIGNED",
          metadata: { ticketId, agentId: assignedTo },
        });
      } catch (inAppError) {
        console.error("Failed to send in-app notification to customer:", inAppError);
      }
      
      // Send email notification to assigned agent
      try {
        await NotificationService.sendEmail(
          assignedAgent.email,
          replaceTemplateVariables(agentAssignmentTemplate.subject, agentVariables),
          replaceTemplateVariables(agentAssignmentTemplate.body, agentVariables)
        );
        
      } catch (emailError) {
        console.error("Failed to send assignment notification email to agent:", emailError);
      }
      
      // Send in-app notification to assigned agent
      try {
        await NotificationService.send({
          userId: assignedAgent.id,
          title: replaceTemplateVariables(agentInAppNotification.title, {
            TICKET_NUMBER: agentVariables.TICKET_NUMBER,
            PRIORITY_LEVEL: agentVariables.PRIORITY_LEVEL,
          }),
          message: replaceTemplateVariables(agentInAppNotification.message, {
            TICKET_NUMBER: agentVariables.TICKET_NUMBER,
            PRIORITY_LEVEL: agentVariables.PRIORITY_LEVEL,
          }),
          type: "TICKET_ASSIGNED",
          metadata: { ticketId, customerId: existingTicket.user.id },
        });
      } catch (inAppError) {
        console.error("Failed to send in-app notification to agent:", inAppError);
      }
      
      // Optional: Send SMS for urgent tickets (if configured)
      if (existingTicket.priority === "URGENT" && process.env.TWILIO_ENABLED === "true") {
        try {
          // Implement SMS notification for urgent tickets
          // await sendSMS(assignedAgent.phone, `Urgent ticket #${ticketId.slice(0, 8)} assigned to you`);
        } catch (smsError) {
          console.error("Failed to send SMS notification:", smsError);
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      ticket,
      notification: assignedTo ? {
        customerNotified: true,
        agentNotified: true,
        channels: ["email", "in_app"]
      } : null
    });
    
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}