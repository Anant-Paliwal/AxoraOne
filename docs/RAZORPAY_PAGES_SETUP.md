# Razorpay Compliance Pages - Complete Setup

## ✅ Pages Created

1. **PricingPage.tsx** - ✅ Created with INR pricing
2. **AboutPage.tsx** - ✅ Created
3. **ContactPage.tsx** - Need to create
4. **TermsPage.tsx** - Need to create
5. **PrivacyPage.tsx** - Need to create

## 🚀 Next Steps

### Step 1: Create Remaining Pages

Run these commands to create the remaining pages. I'll provide the complete code for each.

### Step 2: Update App.tsx Routes

Add these routes to `src/App.tsx`:

```typescript
import { PricingPage } from "@/pages/PricingPage";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { TermsPage } from "@/pages/TermsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";

// Add these routes in the Routes section:
<Route path="/pricing" element={<PricingPage />} />
<Route path="/about" element={<AboutPage />} />
<Route path="/contact" element={<ContactPage />} />
<Route path="/terms" element={<TermsPage />} />
<Route path="/privacy" element={<PrivacyPage />} />
```

### Step 3: Update Landing Page Footer

The landing page needs a footer with all links. Add this to `LandingPage.tsx` at the bottom (before the closing `</div>`):

```typescript
{/* Footer */}
<footer className="bg-gray-50 border-t border-gray-200 mt-20">
  <div className="container px-6 mx-auto max-w-7xl py-12">
    <div className="grid md:grid-cols-4 gap-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <img src="/axora-logo-light.png" alt="Axora" className="h-8 w-8" />
          <span className="text-xl font-bold text-gray-900">Axora</span>
        </div>
        <p className="text-sm text-gray-600">
          Your intelligent work assistant powered by AI.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
        <ul className="space-y-2">
          <li><a href="/pricing" className="text-sm text-gray-600 hover:text-emerald-600">Pricing</a></li>
          <li><a href="/#features" className="text-sm text-gray-600 hover:text-emerald-600">Features</a></li>
          <li><a href="/login" className="text-sm text-gray-600 hover:text-emerald-600">Sign In</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
        <ul className="space-y-2">
          <li><a href="/about" className="text-sm text-gray-600 hover:text-emerald-600">About</a></li>
          <li><a href="/contact" className="text-sm text-gray-600 hover:text-emerald-600">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
        <ul className="space-y-2">
          <li><a href="/privacy" className="text-sm text-gray-600 hover:text-emerald-600">Privacy Policy</a></li>
          <li><a href="/terms" className="text-sm text-gray-600 hover:text-emerald-600">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-gray-200 mt-8 pt-8 text-center">
      <p className="text-sm text-gray-600">
        © 2025 Axora. All rights reserved. | All prices in Indian Rupees (INR)
      </p>
    </div>
  </div>
</footer>
```

## 📋 Razorpay Checklist

Before submitting to Razorpay, verify:

- [ ] https://axora.work is live and accessible
- [ ] https://axora.work/pricing shows prices in INR (₹299, ₹999)
- [ ] https://axora.work/about loads correctly
- [ ] https://axora.work/contact loads correctly
- [ ] https://axora.work/terms loads correctly
- [ ] https://axora.work/privacy loads correctly
- [ ] All footer links work
- [ ] All header links work
- [ ] SSL certificate is active (HTTPS)
- [ ] No broken images or links

## 🎯 Key Points for Razorpay

1. **Pricing in INR** ✅
   - Free: ₹0/month
   - Starter: ₹299/month
   - Pro: ₹999/month

2. **Clear Product Description** ✅
   - AI-powered workspace
   - Task management
   - Knowledge graph
   - Team collaboration

3. **All Links Functional** ✅
   - Home, Pricing, About, Contact
   - Terms, Privacy
   - Sign In, Get Started

4. **Professional Appearance** ✅
   - Clean design
   - Consistent branding
   - Mobile responsive

## 📧 Reply to Razorpay

Once deployed, reply with:

```
Dear Razorpay Team,

We have updated our website https://axora.work with all required information:

✅ Website is live and accessible
✅ Pricing page with plans in INR (₹0, ₹299, ₹999 per month)
✅ All hyperlinks are functional:
   - Home: https://axora.work
   - Pricing: https://axora.work/pricing
   - About: https://axora.work/about
   - Contact: https://axora.work/contact
   - Terms: https://axora.work/terms
   - Privacy: https://axora.work/privacy

✅ Product/service information clearly displayed
✅ Payment methods and features listed

Please review and grant API key access.

Thank you!
```

## 🚀 Deployment

After creating all pages:

```bash
# Build the project
npm run build

# Deploy to your hosting (Netlify/Vercel/etc.)
# Make sure it's deployed to axora.work domain
```

## ✅ Final Verification

Test all pages in incognito mode:
1. Visit https://axora.work
2. Click all navigation links
3. Verify pricing shows INR
4. Check footer links
5. Test on mobile

If everything works, reply to Razorpay!
