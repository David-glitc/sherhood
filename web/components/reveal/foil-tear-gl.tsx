"use client"

import { useEffect, useRef } from "react"

const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform sampler2D u_sealed;
uniform sampler2D u_revealed;
uniform float u_progress;
uniform float u_time;
uniform vec3 u_accent;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  float n = noise(uv * vec2(14.0, 22.0) + u_time * 0.35);
  float tearY = 1.0 - u_progress * 1.18 + (n - 0.5) * 0.08;
  float edge = smoothstep(tearY - 0.012, tearY + 0.012, uv.y);
  float foilBand = smoothstep(0.0, 0.035, abs(uv.y - tearY));
  foilBand = 1.0 - foilBand;

  vec4 sealed = texture(u_sealed, uv);
  vec4 revealed = texture(u_revealed, uv);

  // Slight UV jitter on sealed side near tear
  vec2 sealedUv = uv + vec2((n - 0.5) * 0.01 * foilBand, 0.0);
  sealed = texture(u_sealed, sealedUv);

  vec4 color = mix(sealed, revealed, edge);

  // Lime / rarity foil rim
  color.rgb += u_accent * foilBand * 1.35 * (0.55 + 0.45 * sin(u_time * 18.0 + uv.x * 40.0));

  // Specular sparkles on sealed foil
  float spark = step(0.96, noise(uv * 80.0 + u_time * 2.0));
  color.rgb += spark * (1.0 - edge) * u_accent * 0.85;

  outColor = color;
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)
  if (!sh) throw new Error("shader")
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(info || "compile")
  }
  return sh
}

function loadTexture(gl: WebGL2RenderingContext, url: string): Promise<WebGLTexture> {
  return new Promise((resolve, reject) => {
    const tex = gl.createTexture()
    if (!tex) {
      reject(new Error("texture"))
      return
    }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      resolve(tex)
    }
    img.onerror = () => reject(new Error(`load ${url}`))
    img.src = url
  })
}

type FoilTearGlProps = {
  sealedSrc: string
  revealedSrc: string
  progress: number
  accent: string
  className?: string
  /** When true, skips WebGL and shows sealed→revealed crossfade via CSS. */
  fallback?: boolean
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  const n = Number.parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** WebGL2 foil tear between sealed pack and revealed Sherd art. */
export function FoilTearGl({
  sealedSrc,
  revealedSrc,
  progress,
  accent,
  className,
  fallback,
}: FoilTearGlProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => {
    if (fallback) return
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    })
    if (!gl) return

    let disposed = false
    let raf = 0
    const start = performance.now()

    const run = async () => {
      try {
        const vs = compile(gl, gl.VERTEX_SHADER, VERT)
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
        const prog = gl.createProgram()
        if (!prog) return
        gl.attachShader(prog, vs)
        gl.attachShader(prog, fs)
        gl.linkProgram(prog)
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return

        const buf = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW
        )
        const loc = gl.getAttribLocation(prog, "a_pos")
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

        const [sealed, revealed] = await Promise.all([
          loadTexture(gl, sealedSrc),
          loadTexture(gl, revealedSrc),
        ])
        if (disposed) return

        const uProgress = gl.getUniformLocation(prog, "u_progress")
        const uTime = gl.getUniformLocation(prog, "u_time")
        const uAccent = gl.getUniformLocation(prog, "u_accent")
        const uSealed = gl.getUniformLocation(prog, "u_sealed")
        const uRevealed = gl.getUniformLocation(prog, "u_revealed")
        const rgb = hexToRgb(accent)

        const draw = () => {
          if (disposed) return
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
          const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
            gl.viewport(0, 0, w, h)
          }
          gl.useProgram(prog)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, sealed)
          gl.uniform1i(uSealed, 0)
          gl.activeTexture(gl.TEXTURE1)
          gl.bindTexture(gl.TEXTURE_2D, revealed)
          gl.uniform1i(uRevealed, 1)
          gl.uniform1f(uProgress, Math.min(1, Math.max(0, progressRef.current)))
          gl.uniform1f(uTime, (performance.now() - start) / 1000)
          gl.uniform3f(uAccent, rgb[0], rgb[1], rgb[2])
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          raf = requestAnimationFrame(draw)
        }
        draw()
      } catch {
        /* WebGL unavailable — parent shows CSS fallback */
      }
    }
    void run()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
    }
  }, [sealedSrc, revealedSrc, accent, fallback])

  if (fallback) {
    return (
      <div className={className} style={{ position: "relative", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sealedSrc}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ opacity: 1 - progress }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={revealedSrc}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{
            clipPath: `inset(0 0 ${(1 - progress) * 100}% 0)`,
          }}
        />
      </div>
    )
  }

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
