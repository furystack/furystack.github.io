"use strict";(self.webpackChunkfurystack_github_io=self.webpackChunkfurystack_github_io||[]).push([[214],{7213:function(t,e,i){i.d(e,{m:function(){return x}});var n=i(366),o=i(4316),r=i(1597),a=i(2043),s=i(7294),l=i(917),c=i(3163),p=i(3325),f=i(8409),u=i(6805),d=i(9129),g=i(9719),m=i(9126),h=i(9936);let b=function(t){function e(){for(var e,i=arguments.length,n=new Array(i),o=0;o<i;o++)n[o]=arguments[o];return(e=t.call.apply(t,[this].concat(n))||this).subscribe=s.createRef(),e.titleRef=s.createRef(),e.lastScrollY=0,e.ticking=!1,e.state={showTitle:!1},e.openModal=()=>{e.subscribe.current&&e.subscribe.current.open()},e.onScroll=()=>{e.titleRef&&e.titleRef.current&&(e.ticking||requestAnimationFrame(e.update),e.ticking=!0)},e.update=()=>{if(!e.titleRef||!e.titleRef.current)return;e.lastScrollY=window.scrollY;const t=e.titleRef.current.getBoundingClientRect().top,i=e.titleRef.current.offsetHeight+35;e.lastScrollY>=t+i?e.setState({showTitle:!0}):e.setState({showTitle:!1}),e.ticking=!1},e}(0,n.Z)(e,t);var i=e.prototype;return i.componentDidMount=function(){this.lastScrollY=window.scrollY,this.props.isPost&&window.addEventListener("scroll",this.onScroll,{passive:!0})},i.componentWillUnmount=function(){window.removeEventListener("scroll",this.onScroll)},i.render=function(){const{isHome:t=!1,isPost:e=!1,post:i={}}=this.props;return(0,l.tZ)(s.Fragment,null,f.Z.showSubscribe&&(0,l.tZ)(m.p,{ref:this.subscribe}),(0,l.tZ)("nav",{css:y},(0,l.tZ)(v,{className:"site-nav-left"},!t&&(0,l.tZ)(h.B,null),(0,l.tZ)(Z,{css:[this.state.showTitle?C:"","",""]},(0,l.tZ)("ul",{css:w,role:"menu"},(0,l.tZ)("li",{role:"menuitem"},(0,l.tZ)(r.rU,{to:"/",activeClassName:"nav-current"},"Home")),(0,l.tZ)("li",{role:"menuitem"},(0,l.tZ)(r.rU,{to:"/tags/getting-started/",activeClassName:"nav-current"},"Getting Started")),(0,l.tZ)("li",{role:"menuitem"},(0,l.tZ)(r.rU,{to:"/packages/",activeClassName:"nav-current"},"Packages")),(0,l.tZ)("li",{role:"menuitem"},(0,l.tZ)(r.rU,{to:"/about",activeClassName:"nav-current"},"About"))),e&&(0,l.tZ)(q,{ref:this.titleRef,className:"nav-post-title"},i.title))),(0,l.tZ)(k,null,(0,l.tZ)(S,null,f.Z.facebook&&(0,l.tZ)("a",{className:"social-link-fb",css:[p.IW,p.kt,"",""],href:f.Z.facebook,target:"_blank",title:"Facebook",rel:"noopener noreferrer"},(0,l.tZ)(u.s,null)),f.Z.twitter&&(0,l.tZ)("a",{css:p.IW,href:f.Z.twitter,title:"Twitter",target:"_blank",rel:"noopener noreferrer"},(0,l.tZ)(d.t,null)),f.Z.github&&(0,l.tZ)("a",{css:p.IW,href:f.Z.github,title:"Github",target:"_blank",rel:"noopener noreferrer"},(0,l.tZ)(g.E,null))),f.Z.showSubscribe&&(0,l.tZ)(R,{onClick:this.openModal},"Subscribe"))))},e}(s.Component);const x=(0,l.iv)("position:fixed;top:0;right:0;left:0;z-index:1000;background:",(0,a._j)("0.05",c.O.darkgrey),";@media (max-width: 700px){padding-right:0;padding-left:0;}","","",""),y={name:"lcmrfl",styles:"position:relative;z-index:100;display:flex;justify-content:space-between;align-items:flex-start;overflow-y:hidden;height:64px;font-size:1.3rem"},v=(0,o.Z)("div",{target:"e1a8f0nq5"})({name:"crtwut",styles:"flex:1 0 auto;display:flex;align-items:center;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;margin-right:10px;padding:10px 0 80px;font-weight:500;letter-spacing:0.2px;text-transform:uppercase;white-space:nowrap;-ms-overflow-scrolling:touch;@media (max-width: 700px){margin-right:0;padding-left:5vw;}"}),Z=(0,o.Z)("div",{target:"e1a8f0nq4"})({name:"ggt2ij",styles:"position:relative;align-self:flex-start"}),w={name:"d1pqrt",styles:"position:absolute;z-index:1000;display:flex;margin:0 0 0 -12px;padding:0;list-style:none;transition:all 1s cubic-bezier(0.19, 1, 0.22, 1);li{display:block;margin:0;padding:0;}li a{position:relative;display:block;padding:12px 12px;color:#fff;opacity:0.8;transition:opacity 0.35s ease-in-out;}li a:hover{text-decoration:none;opacity:1;}li a:before{content:'';position:absolute;right:100%;bottom:8px;left:12px;height:1px;background:#fff;opacity:0.25;transition:all 0.35s ease-in-out;}li a:hover:before{right:12px;opacity:0.5;}.nav-current{opacity:1;}"},k=(0,o.Z)("div",{target:"e1a8f0nq3"})({name:"1p9q30u",styles:"flex:0 1 auto;display:flex;align-items:center;justify-content:flex-end;padding:10px 0;height:64px;@media (max-width: 700px){display:none;}"}),S=(0,o.Z)("div",{target:"e1a8f0nq2"})({name:"1z0rm8f",styles:"flex-shrink:0;display:flex;align-items:center"}),R=(0,o.Z)("a",{target:"e1a8f0nq1"})({name:"tong54",styles:"display:block;padding:4px 10px;margin:0 0 0 10px;border:#fff 1px solid;color:#fff;line-height:1em;border-radius:10px;opacity:0.8;:hover{text-decoration:none;opacity:1;cursor:pointer;}"}),q=(0,o.Z)("span",{target:"e1a8f0nq0"})({name:"1wu52sc",styles:"visibility:hidden;position:absolute;top:9px;color:#fff;font-size:1.7rem;font-weight:400;text-transform:none;opacity:0;transition:all 1s cubic-bezier(0.19, 1, 0.22, 1);transform:translateY(175%);.dash{left:-25px;}.dash:before{content:'– ';opacity:0.5;}"}),C={name:"44uflt",styles:"ul{visibility:hidden;opacity:0;transform:translateY(-175%);}.nav-post-title{visibility:visible;opacity:1;transform:translateY(0);}"};e.Z=b}}]);
//# sourceMappingURL=af52a822-c6c50e9dd04fcabe2a53.js.map