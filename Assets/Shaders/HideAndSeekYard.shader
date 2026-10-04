// Vertex-colour stand-in for the baked yard. Swap the material when a lit shader is wanted.
// Alpha of the vertex colour is an emissive flag from the generators (ctx.emissive), not transparency.
Shader "HideAndSeek/YardVertex"
{
    SubShader
    {
        Tags { "RenderType" = "Opaque" "Queue" = "Geometry" }
        Cull Off
        LOD 100
        Pass
        {
            Tags { "LightMode" = "ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float4 color : COLOR;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 worldNormal : TEXCOORD0;
                float4 color : COLOR;
            };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                o.color = v.color;
                return o;
            }

            fixed4 frag(v2f i) : SV_Target
            {
                float3 n = normalize(i.worldNormal);
                float ndl = saturate(dot(n, normalize(float3(0.35, 0.86, 0.28))));
                float lit = ndl * 0.7 + 0.3;
                float shade = lerp(lit, 1.0, i.color.a);
                return fixed4(i.color.rgb * shade, 1);
            }
            ENDCG
        }
    }
    Fallback "Diffuse"
}
