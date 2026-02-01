# Page snapshot

```yaml
- generic [active]:
  - alert [ref=e1]
  - dialog "Failed to compile" [ref=e4]:
    - generic [ref=e5]:
      - heading "Failed to compile" [level=4] [ref=e7]
      - generic [ref=e8]:
        - generic [ref=e10]: "./app/(routes)/workspace/_components/Canvas.tsx Error: x Unexpected token `div`. Expected jsx identifier ,-[/Users/pranavkrishnau/Desktop/ERASERIO/app/(routes)/workspace/_components/Canvas.tsx:138:1] 138 | }, []); 139 | 140 | return ( 141 | <div : ^^^ 142 | ref={containerRef} 143 | className=\"excalidraw-container relative w-full h-full\" 144 | style={{ `---- Caused by: Syntax Error"
        - contentinfo [ref=e11]:
          - paragraph [ref=e12]: This error occurred during the build process and can only be dismissed by fixing the error.
```