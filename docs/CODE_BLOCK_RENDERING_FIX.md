# Code Block Rendering Fix

## 🔴 Problem

When the agent generates content with code blocks, they're not rendering properly in the Ask Anything UI.

## 🔍 Investigation

The `MarkdownRenderer` component (`src/components/MarkdownRenderer.tsx`) **DOES** support code blocks:

```typescript
// Code blocks detection (lines 68-91)
if (line.startsWith('```')) {
  if (!inCodeBlock) {
    inCodeBlock = true;
    codeBlockLang = line.slice(3).trim();
  } else {
    // Render code block with syntax highlighting label
    elements.push(
      <div className="my-4 rounded-xl bg-muted/50 border border-border overflow-hidden">
        {codeBlockLang && (
          <div className="px-4 py-2 bg-muted border-b border-border text-xs font-mono text-muted-foreground">
            {codeBlockLang}
          </div>
        )}
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-foreground">
            {codeBlockContent.join('\n')}
          </code>
        </pre>
      </div>
    );
  }
}
```

## ✅ Proper Format

The agent should generate code blocks in this format:

````markdown
Here's a Python example:

```python
def hello_world():
    print("Hello, World!")
    return True
```

This function prints a greeting.
````

## 🧪 Test Cases

### Test 1: Simple Code Block
**Agent Response:**
````
Here's a SQL query:

```sql
SELECT * FROM users WHERE active = true;
```
````

**Expected:** Code block with "sql" label and proper formatting ✅

### Test 2: Multiple Code Blocks
**Agent Response:**
````
Python example:

```python
print("Hello")
```

JavaScript example:

```javascript
console.log("Hello");
```
````

**Expected:** Two separate code blocks, each with language label ✅

### Test 3: Code Block Without Language
**Agent Response:**
````
Generic code:

```
some code here
```
````

**Expected:** Code block without language label ✅

## 🔧 Potential Issues

### Issue 1: Agent Not Using Proper Markdown Format

If the agent is generating code like this:
```
python
def hello():
    pass
```

Instead of:
````
```python
def hello():
    pass
```
````

**Fix:** Ensure the agent wraps code in triple backticks.

### Issue 2: Extra Spaces or Characters

If there are extra spaces before the backticks:
```
   ```python  (extra spaces)
```

**Fix:** The MarkdownRenderer checks `line.startsWith('```')` which requires no leading spaces.

## ✅ Solution

The MarkdownRenderer is working correctly. The issue is likely:

1. **Agent not using proper markdown format** - Check agent's content generation
2. **Response not including code blocks** - Check if `generated_blocks` vs `response` text

Let me check how the agent generates content with code blocks...

## 🔍 Next Steps

1. Check agent's content generation methods
2. Verify the agent is using proper markdown format
3. Test with a simple code block example
4. Add better error handling for malformed code blocks

## 📝 Quick Test

To test if code blocks work, try this in Ask Anything:

**User:** "Show me a Python hello world example"

**Expected Agent Response:**
````
Here's a simple Python hello world program:

```python
def hello_world():
    print("Hello, World!")

if __name__ == "__main__":
    hello_world()
```

This program defines a function that prints "Hello, World!" and calls it when the script is run directly.
````

If this renders correctly, the MarkdownRenderer is working fine.
