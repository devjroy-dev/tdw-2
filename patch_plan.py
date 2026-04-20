path = '/workspaces/tdw-2/web/app/couple/plan/page.tsx'
with open(path) as f:
    content = f.read()

# The soft-message block to remove
old = """  // No session — soft message
  if (!session) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
          * { box-sizing: border-box; } body { margin: 0; background: #FAFAF8; }
        `}</style>
        <div style={{ minHeight: '100dvh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontFamily: \"'Cormorant Garamond', serif\", fontSize: 20, fontWeight: 300, fontStyle: 'italic', color: '#3C3835' }}>
            Sign in to view your plan.
          </p>
        </div>
      </>
    );
  }"""

new = """  // No session — redirect to login
  if (!session) {
    if (typeof window !== 'undefined') window.location.replace('/couple/login');
    return null;
  }"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('✅ Plan page: no-session redirect applied')
else:
    print('❌ String not found. Trying line-number surgery...')
    lines = content.split('\n')
    # Find the marker line
    for i, line in enumerate(lines):
        if '// No session' in line and 'soft message' in line:
            print(f'  Found marker at line {i+1}: {repr(line)}')
            # Find end of the if block (closing brace pair)
            # Count from i: find `  }` after the return block
            depth = 0
            end_idx = i
            in_block = False
            for j in range(i, min(i+30, len(lines))):
                if '{' in lines[j]: depth += lines[j].count('{') - lines[j].count('}')
                elif '}' in lines[j]: depth += lines[j].count('{') - lines[j].count('}')
                if j > i and depth == 0 and lines[j].strip() == '}':
                    end_idx = j
                    break
            print(f'  Block spans lines {i+1}–{end_idx+1}')
            replacement = [
                '  // No session — redirect to login',
                "  if (!session) {",
                "    if (typeof window !== 'undefined') window.location.replace('/couple/login');",
                "    return null;",
                "  }",
            ]
            lines[i:end_idx+1] = replacement
            with open(path, 'w') as f:
                f.write('\n'.join(lines))
            print('✅ Plan page: applied via line surgery')
            break
    else:
        print('❌ Could not find marker line either. Manual fix needed.')
