#!/usr/bin/env python3
"""Materialize BMC-04 real-donor semantic mesh and local host-plane projection."""
from __future__ import annotations
import argparse, json
from pathlib import Path


def lerp(a,b,t):
    return [float(a[0])+(float(b[0])-float(a[0]))*t, float(a[1])+(float(b[1])-float(a[1]))*t]


def project(host_quad, host_size_mm, point_mm):
    width, depth = map(float, host_size_mm)
    x, y = map(float, point_mm)
    if width <= 0 or depth <= 0:
        raise ValueError("host dimensions must be positive")
    u=x/width; v=y/depth
    front=lerp(host_quad["frontLeft"],host_quad["frontRight"],u)
    back=lerp(host_quad["backLeft"],host_quad["backRight"],u)
    return lerp(front,back,v)


def rect_quad(host_quad, host_size_mm, offset, size):
    ox,oy=map(float,offset); w,d=map(float,size)
    return {
        "frontLeft":project(host_quad,host_size_mm,[ox,oy]),
        "frontRight":project(host_quad,host_size_mm,[ox+w,oy]),
        "backRight":project(host_quad,host_size_mm,[ox+w,oy+d]),
        "backLeft":project(host_quad,host_size_mm,[ox,oy+d]),
    }


def center_preserving_offset(old_offset, old_size, new_size):
    cx=float(old_offset[0])+float(old_size[0])/2
    cy=float(old_offset[1])+float(old_size[1])/2
    return [cx-float(new_size[0])/2, cy-float(new_size[1])/2]


def edge(a,b):
    return [float(b[0])-float(a[0]), float(b[1])-float(a[1])]


def normalized_to_host(anchor, offset, size, host_quad, host_size):
    u,v=map(float,anchor)
    local=[float(offset[0])+u*float(size[0]), float(offset[1])+v*float(size[1])]
    return {"localMm":local, "targetPx":project(host_quad,host_size,local)}


def evaluate(cfg):
    host=cfg["host"]
    legacy=cfg["legacyInferredFootprint"]
    compact=cfg["compactCalibration"]
    offset=center_preserving_offset(legacy["offsetMmFromHostFrontLeft"],legacy["sizeMm"],compact["sizeMm"])
    legacy_quad=rect_quad(host["quadPx"],host["physicalSizeMm"],legacy["offsetMmFromHostFrontLeft"],legacy["sizeMm"])
    compact_quad=rect_quad(host["quadPx"],host["physicalSizeMm"],offset,compact["sizeMm"])
    anchors={}
    for name,spec in cfg["semanticAnchors"].items():
        a=normalized_to_host(spec["normalizedPhysical"],offset,compact["sizeMm"],host["quadPx"],host["physicalSizeMm"])
        anchors[name]={"kind":spec["kind"],"normalizedRaster":spec["normalizedRaster"],"normalizedPhysical":spec["normalizedPhysical"],**a}
    return {
        "schemaVersion":"BMC04CompactDonorMeshReport 0.1",
        "sceneId":cfg["sceneId"],
        "operationId":cfg["operationId"],
        "status":"RESEARCH_CANDIDATE",
        "promotionEligible":False,
        "sourceProduct":cfg["sourceProduct"],
        "donorRasterMeasurement":cfg["donorRasterMeasurement"],
        "host":host,
        "legacyFootprint":{"offsetMm":legacy["offsetMmFromHostFrontLeft"],"sizeMm":legacy["sizeMm"],"quadPx":legacy_quad},
        "compactFootprint":{
            "placementPolicy":compact["placementPolicy"],
            "offsetMm":offset,
            "sizeMm":compact["sizeMm"],
            "quadPx":compact_quad,
            "edgesPx":{
                "frontWidth":edge(compact_quad["frontLeft"],compact_quad["frontRight"]),
                "backWidth":edge(compact_quad["backLeft"],compact_quad["backRight"]),
                "leftDepth":edge(compact_quad["frontLeft"],compact_quad["backLeft"]),
                "rightDepth":edge(compact_quad["frontRight"],compact_quad["backRight"]),
            }
        },
        "semanticAnchors":anchors,
        "semanticRules":cfg["semanticRules"],
        "limitations":[
            "Consul envelope/topology are real-product evidence, but component anchor coordinates are inferred from an official product raster, not CAD",
            "placement in the legacy kitchen is center-preserving local-planar derivation, not confirmed appliance installation geometry",
            "Stone02 mapping remains local-derived and is not a global camera calibration",
            "guide geometry constrains generation; generation remains appearance authoring only"
        ]
    }


def svg_header(viewbox,width,height):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{width}" height="{height}">\n'


def donor_svg(cfg):
    w,d=map(float,cfg["sourceProduct"]["physicalSizeMm"])
    r=float(cfg["semanticRules"]["burnerGuideRadiusNormalizedWidth"])*w
    kr=float(cfg["semanticRules"]["controlGuideRadiusNormalizedWidth"])*w
    out=[svg_header(f'0 0 {w:g} {d:g}',1130,920)]
    out += [
      '<rect width="100%" height="100%" fill="#121417"/>',
      f'<rect x="0" y="0" width="{w:g}" height="{d:g}" fill="#20242a" stroke="#d8dee9" stroke-width="2"/>',
      '<g stroke="#58616b" stroke-width="1" opacity="0.55">'
    ]
    for i in range(1,5):
        x=w*i/5; out.append(f'<line x1="{x:.3f}" y1="0" x2="{x:.3f}" y2="{d:g}"/>')
        y=d*i/5; out.append(f'<line x1="0" y1="{y:.3f}" x2="{w:g}" y2="{y:.3f}"/>')
    out.append('</g>')
    for name,spec in cfg["semanticAnchors"].items():
        x=float(spec["normalizedRaster"][0])*w; y=float(spec["normalizedRaster"][1])*d
        rad=kr if spec["kind"]=="control-center" else r
        color="#ffd166" if spec["kind"]=="control-center" else "#66e3ff"
        out.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{rad:.3f}" fill="none" stroke="{color}" stroke-width="3"/>')
        out.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="3" fill="{color}"/>')
        out.append(f'<text x="{x+5:.3f}" y="{y-5:.3f}" font-size="12" fill="{color}" font-family="monospace">{name}</text>')
    out += [
      '<line x1="20" y1="440" x2="545" y2="440" stroke="#ff7b72" stroke-width="3" marker-end="url(#a)"/>',
      '<line x1="20" y1="440" x2="20" y2="20" stroke="#a5d6ff" stroke-width="3" marker-end="url(#a)"/>',
      '<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="context-stroke"/></marker></defs>',
      '<text x="22" y="455" font-size="13" fill="#ff7b72" font-family="monospace">width / left→right</text>',
      '<text x="25" y="34" font-size="13" fill="#a5d6ff" font-family="monospace">depth / front→back</text>',
      '<text x="12" y="18" font-size="14" fill="#ffffff" font-family="monospace">Consul CD060BE semantic donor mesh — 565 × 460 mm</text>',
      '</svg>'
    ]
    return '\n'.join(out)


def target_svg(report):
    host=report["host"]["quadPx"]
    old=report["legacyFootprint"]["quadPx"]
    new=report["compactFootprint"]["quadPx"]
    out=[svg_header('500 540 250 45',1250,300),'<rect x="500" y="540" width="250" height="45" fill="#11161c"/>']
    def poly(q):
        return ' '.join(f'{q[k][0]:.3f},{q[k][1]:.3f}' for k in ['frontLeft','frontRight','backRight','backLeft'])
    out.append(f'<polygon points="{poly(host)}" fill="none" stroke="#687684" stroke-width="0.8"/>')
    out.append(f'<polygon points="{poly(old)}" fill="none" stroke="#ff7b72" stroke-width="0.7" stroke-dasharray="3,2" opacity="0.8"/>')
    out.append(f'<polygon points="{poly(new)}" fill="#66e3ff" fill-opacity="0.08" stroke="#66e3ff" stroke-width="1.1"/>')
    fl,fr,br,bl=[new[k] for k in ['frontLeft','frontRight','backRight','backLeft']]
    for t in [0.25,0.5,0.75]:
        p0=lerp(fl,fr,t); p1=lerp(bl,br,t)
        out.append(f'<line x1="{p0[0]:.3f}" y1="{p0[1]:.3f}" x2="{p1[0]:.3f}" y2="{p1[1]:.3f}" stroke="#3b8da4" stroke-width="0.45"/>')
    for t in [0.25,0.5,0.75]:
        p0=lerp(fl,bl,t); p1=lerp(fr,br,t)
        out.append(f'<line x1="{p0[0]:.3f}" y1="{p0[1]:.3f}" x2="{p1[0]:.3f}" y2="{p1[1]:.3f}" stroke="#3b8da4" stroke-width="0.45"/>')
    for a,b in [(fl,bl),(fr,br)]:
        out.append(f'<line x1="{a[0]:.3f}" y1="{a[1]:.3f}" x2="{b[0]:.3f}" y2="{b[1]:.3f}" stroke="#a5d6ff" stroke-width="0.9"/>')
    for name,a in report["semanticAnchors"].items():
        x,y=a["targetPx"]
        color="#ffd166" if a["kind"]=="control-center" else "#7ee787"
        out.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="1.25" fill="{color}" stroke="#0d1117" stroke-width="0.25"/>')
        out.append(f'<text x="{x+1.8:.3f}" y="{y-1.3:.3f}" font-size="2.5" fill="{color}" font-family="monospace">{name}</text>')
    out += [
      '<text x="502" y="544" font-size="3" fill="#ffffff" font-family="monospace">BMC-04 target: compact real-donor calibration</text>',
      '<text x="502" y="547.5" font-size="2.6" fill="#ff7b72" font-family="monospace">dashed red = legacy 600×520 inferred footprint</text>',
      '<text x="502" y="551" font-size="2.6" fill="#66e3ff" font-family="monospace">cyan = centered 565×460 donor-calibrated footprint</text>',
      '<text x="502" y="554.5" font-size="2.6" fill="#ffd166" font-family="monospace">yellow = 4 control anchors; green = 4 burner anchors</text>',
      '</svg>'
    ]
    return '\n'.join(out)


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--config',type=Path,required=True)
    ap.add_argument('--report',type=Path,required=True)
    ap.add_argument('--donor-svg',type=Path,required=True)
    ap.add_argument('--target-svg',type=Path,required=True)
    args=ap.parse_args()
    cfg=json.loads(args.config.read_text(encoding='utf-8'))
    if cfg.get('schemaVersion')!='BMC04CompactDonorMesh 0.1':
        raise SystemExit('unsupported schema')
    report=evaluate(cfg)
    for p in [args.report,args.donor_svg,args.target_svg]: p.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps(report,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    args.donor_svg.write_text(donor_svg(cfg)+'\n',encoding='utf-8')
    args.target_svg.write_text(target_svg(report)+'\n',encoding='utf-8')
    print(json.dumps({
      'status':report['status'],
      'compactOffsetMm':report['compactFootprint']['offsetMm'],
      'compactQuadPx':report['compactFootprint']['quadPx'],
      'semanticAnchors':{k:v['targetPx'] for k,v in report['semanticAnchors'].items()}
    },sort_keys=True))
    return 0

if __name__=='__main__':
    raise SystemExit(main())
