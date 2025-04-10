import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TermsOfService() {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const date = new Date();
    setCurrentDate(
      `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-500">Last Updated: {currentDate}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              Welcome to Smart Scheduler. By accessing or using our calendar scheduling platform and related services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you and Smart Scheduler ("we," "our," or "us") regarding your use of the Service. Please read them carefully.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">2. Eligibility</h2>
            <p>
              You must be at least 16 years old to use the Service. By using the Service, you represent and warrant that you meet this requirement and that you have the right, authority, and capacity to enter into these Terms.
            </p>
            <p>
              If you are using the Service on behalf of an organization or entity, you represent and warrant that you have the authority to bind that organization or entity to these Terms, and you agree to be bound by these Terms on behalf of that organization or entity.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">3. Account Registration</h2>
            <p>
              To access certain features of the Service, you may need to register for an account. When you register, you agree to provide accurate, current, and complete information about yourself and to keep this information up to date.
            </p>
            <p>
              You are responsible for safeguarding your account credentials and for any activity that occurs under your account. You must promptly notify us of any unauthorized use of your account or any other breach of security.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">4. Subscription and Payment Terms</h2>
            <h3 className="text-lg font-medium mb-2">4.1 Subscription Tiers</h3>
            <p>
              We offer different subscription tiers, including Individual, Team, and Organization plans, with varying features and pricing. The specific features and limitations of each subscription tier are described on our website.
            </p>
            
            <h3 className="text-lg font-medium mb-2">4.2 Payment and Billing</h3>
            <p>
              By subscribing to a paid plan, you agree to pay all fees associated with your subscription. All payments are processed through our third-party payment processors. You must provide accurate and complete payment information.
            </p>
            <p>
              Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your selection). You authorize us to charge your payment method for the subscription fees until you cancel your subscription.
            </p>
            
            <h3 className="text-lg font-medium mb-2">4.3 Free Trials</h3>
            <p>
              We may offer free trials of our paid subscriptions. At the end of the trial period, your subscription will automatically convert to a paid subscription unless you cancel before the trial ends.
            </p>
            
            <h3 className="text-lg font-medium mb-2">4.4 Cancellation and Refunds</h3>
            <p>
              You may cancel your subscription at any time through your account settings. Upon cancellation, your subscription will remain active until the end of your current billing period.
            </p>
            <p>
              We do not provide refunds for partial subscription periods except where required by law.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">5. Use of the Service</h2>
            <h3 className="text-lg font-medium mb-2">5.1 Acceptable Use</h3>
            <p>
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Use the Service in any way that violates any applicable laws or regulations</li>
              <li>Use the Service to transmit or distribute harmful or malicious code</li>
              <li>Attempt to gain unauthorized access to the Service or related systems</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Collect or harvest information about other users without their consent</li>
              <li>Use the Service to send unsolicited communications or advertising</li>
              <li>Engage in any activity that could harm, disable, or impair the Service</li>
            </ul>
            
            <h3 className="text-lg font-medium mb-2">5.2 Calendar Data and Third-Party Services</h3>
            <p>
              The Service may allow you to connect to third-party calendar services (such as Google Calendar). By connecting these services, you authorize us to access and use your calendar data as needed to provide the Service.
            </p>
            <p>
              You are responsible for complying with the terms of service of any third-party services you connect to our Service.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">6. Intellectual Property</h2>
            <h3 className="text-lg font-medium mb-2">6.1 Our Intellectual Property</h3>
            <p>
              The Service and its contents, including but not limited to text, graphics, logos, icons, images, software, and other materials, are owned by or licensed to Smart Scheduler and are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p>
              We grant you a limited, non-exclusive, non-transferable, and revocable license to use the Service for its intended purpose, subject to these Terms.
            </p>
            
            <h3 className="text-lg font-medium mb-2">6.2 Your Content</h3>
            <p>
              You retain ownership of any content you submit, post, or display on or through the Service ("Your Content"). By providing Your Content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and display Your Content solely for the purpose of providing and improving the Service.
            </p>
            <p>
              You represent and warrant that you have all necessary rights to Your Content and that Your Content does not infringe or violate any third-party rights.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">7. Privacy</h2>
            <p>
              Our collection and use of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to our collection and use of your information as described in the Privacy Policy.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">8. Disclaimers and Limitations of Liability</h2>
            <h3 className="text-lg font-medium mb-2">8.1 Service Availability</h3>
            <p>
              We strive to provide a reliable Service, but we do not guarantee that the Service will be available at all times or that it will be error-free. The Service may be subject to limitations, delays, and other problems inherent in the use of the internet and electronic communications.
            </p>
            
            <h3 className="text-lg font-medium mb-2">8.2 Disclaimer of Warranties</h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            
            <h3 className="text-lg font-medium mb-2">8.3 Limitation of Liability</h3>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, WHETHER BASED ON CONTRACT, TORT, STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p>
              OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID TO US FOR THE SERVICE DURING THE 12 MONTHS PRECEDING THE CLAIM.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">9. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Smart Scheduler and its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from or relating to:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another person or entity</li>
              <li>Your Content</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">10. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service will cease immediately, and any provision of these Terms that by its nature should survive termination will survive termination.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">11. Modifications to the Service and Terms</h2>
            <p>
              We reserve the right to modify or discontinue the Service, temporarily or permanently, at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
            </p>
            <p>
              We may update these Terms from time to time. If we make material changes, we will notify you by email or by posting a notice on our website. Your continued use of the Service after the effective date of the revised Terms constitutes your acceptance of the revised Terms.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">12. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms are governed by the laws of the State of California, without regard to its conflict of laws principles. Any dispute arising from or relating to these Terms or the Service will be subject to the exclusive jurisdiction of the state and federal courts located in San Francisco County, California.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">13. General Provisions</h2>
            <p>
              These Terms, together with our Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and Smart Scheduler regarding the Service and supersede all prior and contemporaneous agreements, proposals, or representations, whether written or oral.
            </p>
            <p>
              If any provision of these Terms is found to be unenforceable, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of that right or provision. The waiver of any right or provision will be effective only if in writing and signed by a duly authorized representative of Smart Scheduler.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">14. Contact Information</h2>
            <p>
              If you have any questions or concerns about these Terms or the Service, please contact us at:
            </p>
            <p>
              Email: support@mysmartscheduler.co<br />
              Address: 123 Scheduler Ave, Suite 100, San Francisco, CA 94103
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}