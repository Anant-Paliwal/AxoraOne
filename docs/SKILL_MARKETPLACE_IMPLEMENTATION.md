# Skill Marketplace Implementation

## Overview

The Skill Marketplace is a curated collection of pre-built skills that users can browse and install into their workspace. It provides a quick way to add proven skills without having to create them from scratch.

## Features

### 1. Browse Skills
- **Categories**: Planning, Execution, Decision, Research, Learning, Startup
- **Sorting**: Popular, Top Rated, Name
- **Search**: Filter by name, description, or tags
- **Filters**: Category-based filtering

### 2. Skill Cards
Each skill displays:
- Icon and name
- Category and level
- Description
- Rating (out of 5 stars)
- Number of users
- Planner type
- Tags
- Quick install button

### 3. Recommended Skills
- Personalized recommendations based on user's existing skills
- Shows why each skill is recommended
- Appears at the top of the marketplace

### 4. Top Rated Skills
- Sidebar widget showing highest-rated skills
- Quick access to popular choices

### 5. Skill Bundles
- Pre-packaged collections of related skills
- Examples:
  - **Startup Pack**: Idea Validator, MVP Clarity, Experiment Planner
  - **Focus Pack**: Focus Protector, Priority Setter, Delay Detector

### 6. Skill Details
- Full description and purpose
- Goal types (speed, clarity, quality, focus, execution)
- Activation signals (when the skill triggers)
- Complete tag list
- Install button

## Architecture

### Backend (`backend/app/api/endpoints/skill_marketplace.py`)

**Endpoints:**
- `GET /skills/marketplace` - Get all marketplace skills with filtering
- `GET /skills/marketplace/recommended` - Get personalized recommendations
- `GET /skills/marketplace/top-rated` - Get top-rated skills
- `POST /skills/marketplace/install` - Install a skill to workspace
- `GET /skills/marketplace/bundles` - Get skill bundles

**Predefined Skills:**
1. **Idea Validator** (Startup, Beginner) - Validate business ideas
2. **Focus Protector** (Execution, Intermediate) - Minimize distractions
3. **Task Optimizer** (Planning, Intermediate) - Break down large tasks
4. **MVP Clarity** (Startup, Advanced) - Define testable MVPs
5. **Delay Detector** (Execution, Intermediate) - Identify task delays
6. **Priority Setter** (Decision, Intermediate) - Make priority decisions
7. **Milestone Maker** (Planning, Advanced) - Create realistic milestones
8. **Insight Synthesizer** (Research, Advanced) - Synthesize insights
9. **Experiment Planner** (Startup, Advanced) - Design lean experiments

### Frontend (`src/components/skills/SkillMarketplace.tsx`)

**Components:**
- `SkillMarketplace` - Main dialog with sidebar and grid
- `SkillCard` - Individual skill card with install button
- `SkillDetailsDialog` - Full skill details modal

**Features:**
- Real-time search
- Category filtering
- Sort options
- Responsive grid layout
- Loading states
- Error handling

### Integration (`src/pages/SkillsPage.tsx`)

**Added:**
- "Marketplace" button in header
- State management for marketplace dialog
- Reload skills after installation

## Usage

### For Users

1. **Open Marketplace**
   - Click "Marketplace" button on Skills page
   - Browse available skills

2. **Find Skills**
   - Use search bar to find specific skills
   - Filter by category (Planning, Execution, etc.)
   - Sort by Popular, Rating, or Name
   - Check "Recommended for you" section

3. **View Details**
   - Click chevron icon on skill card
   - See full description, purpose, and activation signals
   - Review goal types and tags

4. **Install Skill**
   - Click "Add Skill" button on card
   - Or click "Add to Workspace" in details dialog
   - Skill is instantly added to your workspace
   - Start using it immediately

### For Developers

**Adding New Marketplace Skills:**

Edit `backend/app/api/endpoints/skill_marketplace.py`:

```python
{
    "id": "marketplace_your_skill",
    "name": "Your Skill Name",
    "category": "planning",  # or execution, decision, research, learning, startup
    "level": "Intermediate",
    "description": "Short description",
    "icon": "🎯",
    "tags": ["tag1", "tag2", "tag3"],
    "rating": 4.8,
    "users": 1234,
    "purpose": "Detailed purpose statement",
    "goal_type": ["clarity", "speed"],
    "activation_signals": ["page_created", "task_blocked"],
    "planner_type": "Experiment Planner"
}
```

**Creating Skill Bundles:**

```python
{
    "id": "bundle_your_pack",
    "name": "Your Pack Name",
    "description": "Bundle description",
    "icon": "📦",
    "skills": ["marketplace_skill_1", "marketplace_skill_2"],
    "rating": 4.9,
    "users": 543
}
```

## API Reference

### Get Marketplace Skills
```typescript
api.getMarketplaceSkills(category?: string, sortBy?: string)
```

### Get Recommendations
```typescript
api.getRecommendedSkills(workspaceId?: string)
```

### Install Skill
```typescript
api.installMarketplaceSkill(marketplaceSkillId: string, workspaceId?: string)
```

### Get Top Rated
```typescript
api.getTopRatedSkills(limit?: number)
```

### Get Bundles
```typescript
api.getSkillBundles()
```

## Design Principles

1. **Curated Quality** - Only proven, useful skills in marketplace
2. **Easy Discovery** - Multiple ways to find relevant skills
3. **Quick Install** - One-click installation
4. **Personalization** - Recommendations based on user behavior
5. **Transparency** - Clear descriptions and activation signals
6. **Social Proof** - Ratings and user counts

## Future Enhancements

- [ ] User-submitted skills (with approval process)
- [ ] Skill reviews and comments
- [ ] Skill versioning and updates
- [ ] Bundle customization
- [ ] Skill dependencies
- [ ] Usage analytics per skill
- [ ] Skill templates for custom creation
- [ ] Community ratings
- [ ] Skill categories expansion
- [ ] Advanced filtering (by goal type, activation signals)

## Testing

1. **Open Skills Page**
   - Navigate to `/skills`
   - Click "Marketplace" button

2. **Browse Skills**
   - Try different categories
   - Use search functionality
   - Sort by different criteria

3. **Install Skill**
   - Click "Add Skill" on any card
   - Verify skill appears in main skills list
   - Check skill has correct properties

4. **View Recommendations**
   - Install a few skills in one category
   - Open marketplace again
   - Verify recommendations match your interests

## Troubleshooting

**Marketplace won't open:**
- Check browser console for errors
- Verify API endpoint is accessible
- Check authentication token

**Skills won't install:**
- Verify workspace permissions (need edit access)
- Check for duplicate skill names
- Review backend logs for errors

**Recommendations not showing:**
- Install at least one skill first
- Verify workspace_id is passed correctly
- Check backend recommendation logic

## Summary

The Skill Marketplace provides a streamlined way for users to discover and add proven skills to their workspace. With curated content, personalized recommendations, and one-click installation, it accelerates the onboarding process and helps users leverage the full power of the Intelligence OS.
