# Skill Marketplace - Quick Start Guide

## 🚀 Getting Started (2 minutes)

### Step 1: Access the Marketplace
1. Navigate to the **Skills** page
2. Click the **"Marketplace"** button in the top-right corner
3. The marketplace dialog opens

### Step 2: Browse Skills
- **Search**: Type keywords in the search bar
- **Filter**: Click categories in the left sidebar
- **Sort**: Use the dropdown (Popular, Rating, Name)

### Step 3: Install a Skill
1. Find a skill you like
2. Click **"+ Add Skill"** button
3. Done! The skill is now in your workspace

---

## 📦 What's Included

### 9 Pre-Built Skills

**Planning (3 skills)**
- 📋 Task Optimizer - Break down large tasks
- 🎯 Milestone Maker - Create realistic milestones
- 💡 MVP Clarity - Define testable MVPs

**Execution (2 skills)**
- 🎯 Focus Protector - Minimize distractions
- ⏰ Delay Detector - Identify task delays

**Decision (1 skill)**
- ⭐ Priority Setter - Make priority decisions

**Research (1 skill)**
- 💎 Insight Synthesizer - Synthesize insights

**Startup (3 skills)**
- 💡 Idea Validator - Validate business ideas
- 🚀 MVP Clarity - Define clear MVPs
- 🧪 Experiment Planner - Design lean experiments

### 2 Skill Bundles
- 🚀 **Startup Pack** - 3 essential startup skills
- 🎯 **Focus Pack** - 3 productivity skills

---

## 🎯 Common Use Cases

### "I'm new and want to get started quickly"
1. Open marketplace
2. Look at "Recommended for you" section
3. Install 2-3 skills that match your goals
4. Start using them immediately

### "I need skills for a specific category"
1. Click category in sidebar (e.g., "Execution")
2. Browse filtered skills
3. Install the ones you need

### "I want the most popular skills"
1. Keep sort on "Popular" (default)
2. Check the "Top Rated" sidebar
3. Install highly-rated skills

### "I'm starting a startup"
1. Filter by "Startup" category
2. Or install the "Startup Pack" bundle
3. Get Idea Validator, MVP Clarity, Experiment Planner

---

## 💡 Pro Tips

1. **Check Recommendations** - The marketplace learns from your existing skills
2. **Read Descriptions** - Click the chevron (>) to see full details
3. **Use Bundles** - Install related skills together
4. **Filter by Category** - Find skills for specific needs
5. **Check Activation Signals** - See when skills trigger automatically

---

## 🔧 Technical Details

### Backend
- **File**: `backend/app/api/endpoints/skill_marketplace.py`
- **Endpoints**: `/skills/marketplace/*`
- **Skills**: Predefined in `MARKETPLACE_SKILLS` array

### Frontend
- **Component**: `src/components/skills/SkillMarketplace.tsx`
- **Integration**: `src/pages/SkillsPage.tsx`
- **API**: `src/lib/api.ts` (marketplace methods)

### Installation Process
1. User clicks "Add Skill"
2. Frontend calls `api.installMarketplaceSkill()`
3. Backend creates skill in database
4. Skill appears in user's workspace
5. Ready to use immediately

---

## 🐛 Troubleshooting

**Marketplace button not showing?**
- You need "edit" permissions in the workspace
- Viewers cannot install skills

**Skill won't install?**
- Check if skill name already exists
- Verify workspace permissions
- Check browser console for errors

**No recommendations showing?**
- Install at least one skill first
- Recommendations are based on your existing skills

**Search not working?**
- Try different keywords
- Search looks at name, description, and tags

---

## 📚 Next Steps

After installing skills:
1. **View Skills** - Go back to Skills page
2. **Link Skills** - Connect related skills for chaining
3. **Add Evidence** - Link pages to skills
4. **Track Progress** - Complete tasks to build skill confidence
5. **Get Suggestions** - Click "Get Suggestions" on any skill

---

## 🎉 You're Ready!

The Skill Marketplace gives you instant access to proven, ready-to-use skills. No need to create everything from scratch - just browse, install, and start using!

**Happy skill building! 🚀**
