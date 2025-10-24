# Development UI Controls - Toggle Guide

## Overview

You can control which development/helper UI elements are shown using environment variables:
1. **Next.js Dev Indicator** - Framework's build activity icon (bottom-right corner)
2. **Helper Buttons** - Application helper buttons like Back to Top (left bottom)

## Quick Setup

### 1. Next.js Dev Indicator Control

**Show (Developer Mode)**:
```bash
# Using .env file
echo "SHOW_DEV_INDICATORS=true" >> .env
docker-compose restart frontend-nextjs

# Or using command line
SHOW_DEV_INDICATORS=true docker-compose restart frontend-nextjs
```

**Hide (Clean UI - Default)**:
```bash
# Using .env file
echo "SHOW_DEV_INDICATORS=false" >> .env
docker-compose restart frontend-nextjs

# Or simply restart (default is false)
docker-compose restart frontend-nextjs
```

### 2. Helper Buttons Control

**Show (Developer/Testing Mode)**:
```bash
# Using .env file
echo "SHOW_HELPER_BUTTONS=true" >> .env
docker-compose restart frontend-nextjs

# Or using command line
SHOW_HELPER_BUTTONS=true docker-compose restart frontend-nextjs
```

**Hide (Production-like UI - Default)**:
```bash
# Using .env file
echo "SHOW_HELPER_BUTTONS=false" >> .env
docker-compose restart frontend-nextjs

# Or simply restart (default is false)
docker-compose restart frontend-nextjs
```

### 3. Combined Control

**Full Developer Mode (show everything)**:
```bash
SHOW_DEV_INDICATORS=true SHOW_HELPER_BUTTONS=true docker-compose restart frontend-nextjs
```

**Production Mode (hide everything - Default)**:
```bash
docker-compose restart frontend-nextjs
```

## How It Works

### Next.js Dev Indicator

1. **Configuration File**: `frontend-nextjs/next.config.ts`
   ```typescript
   devIndicators: process.env.SHOW_DEV_INDICATORS === 'true' ? {
     buildActivity: true,
     buildActivityPosition: 'bottom-right',
   } : false,
   ```

2. **Environment Variable**: `SHOW_DEV_INDICATORS`
   - `true`: Show the Next.js framework indicator
   - `false` or unset: Hide it (default)

### Helper Buttons

1. **Component Check**: `frontend-nextjs/components/BackToTopButton.tsx`
   ```typescript
   const showHelpers = process.env.NEXT_PUBLIC_SHOW_HELPER_BUTTONS === 'true';
   if (!showHelpers) {
     return null;
   }
   ```

2. **Environment Variable**: `SHOW_HELPER_BUTTONS`
   - `true`: Show helper buttons
   - `false` or unset: Hide them (default)

3. **Docker Compose**: Passes environment variables to container
   ```yaml
   environment:
     - SHOW_DEV_INDICATORS=${SHOW_DEV_INDICATORS:-false}
     - NEXT_PUBLIC_SHOW_HELPER_BUTTONS=${SHOW_HELPER_BUTTONS:-false}
   ```

## Usage Examples

### Permanent Setting (via .env file)

```bash
# .env
SHOW_DEV_INDICATORS=true   # Show Next.js dev indicator
SHOW_HELPER_BUTTONS=true   # Show helper buttons
```

Then restart:
```bash
docker-compose restart frontend-nextjs
```

### Temporary Toggle (one-time use)

```bash
# Show everything for debugging
SHOW_DEV_INDICATORS=true SHOW_HELPER_BUTTONS=true docker-compose up frontend-nextjs

# Hide everything for demo
docker-compose up frontend-nextjs
```

## Developer Workflow Recommendations

### Scenario 1: Active Development & Debugging
```bash
SHOW_DEV_INDICATORS=true SHOW_HELPER_BUTTONS=true docker-compose restart frontend-nextjs
```
**Benefits**:
- See Next.js build progress
- Monitor compilation status
- Easy navigation with Back to Top
- Full development tooling

### Scenario 2: Testing Features
```bash
SHOW_HELPER_BUTTONS=true docker-compose restart frontend-nextjs
```
**Benefits**:
- Clean UI without framework noise
- Helper buttons available for navigation
- Close to production but with convenience

### Scenario 3: Demo/Production Preview
```bash
docker-compose restart frontend-nextjs
```
**Benefits**:
- Completely clean UI
- No distractions
- Exact production experience

## Notes

- ✅ Changes take effect after container restart (no rebuild needed)
- ✅ Both default to `false` (hidden) for cleaner UI
- ✅ Can be controlled independently or together
- ✅ Next.js dev indicator only appears in development mode anyway
- ✅ Production builds never show these elements regardless of settings
