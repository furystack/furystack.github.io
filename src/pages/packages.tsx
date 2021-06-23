import React from "react"
import { Helmet } from "react-helmet"
import { Footer } from "../components/Footer"
import SiteNav from "../components/header/SiteNav"
import { PostFullContent } from "../components/PostContent"
import { Wrapper } from "../components/Wrapper"
import IndexLayout from "../layouts"
import { SiteHeader, SiteArchiveHeader, outer, SiteNavMain, inner, SiteMain, NoImage } from "../styles/shared"
import { PostFull, PostFullHeader, PostFullTitle } from "../templates/post"
import { css } from '@emotion/react';
import { colors } from '../styles/colors';



const PageTemplate = css`
  .site-main {
    margin-top: 64px;
    padding-bottom: 4vw;
    background: #fff;
  }

  @media (prefers-color-scheme: dark) {
    .site-main {
      /* background: var(--darkmode); */
      background: ${colors.darkmode};
    }
  }
`;


const PackagesPage: React.FC = () => {
    return <IndexLayout>
        <Helmet>
            <title>Packages</title>
        </Helmet>
        <Wrapper css={PageTemplate}>
            <header className="site-archive-header no-image" css={[SiteHeader, SiteArchiveHeader]}>
                <div css={[outer, SiteNavMain]}>
                    <div css={inner}>
                        <SiteNav isHome={false} />
                    </div>
                </div>
            </header>
            <main id="site-main" className="site-main" css={[SiteMain, outer]}>
                <div css={inner}>
                    <article className="post page" css={[PostFull, NoImage]}>
                        <PostFullHeader className="post-full-header">
                            <PostFullTitle className="post-full-title">Packages</PostFullTitle>
                        </PostFullHeader>

                        <PostFullContent className="post-full-content">
                            <div className="post-content">
                                <h5>A List of FuryStack Packages</h5>


                                <p>
                                    The main goal of FuryStack is to bring enterprise-grade architecture to the NodeJS Ecosystem with a pack of separated but perfectly matched parts.
                                    You can build a modern scalable backend service in no-time and a responsive SPA frontend without bloating your app with 3rd party
                                    and low quality, often abandoned dependencies. Developer experience is the main focus while the framework also tries to encourage keeping the code
                                    clean and decoupled.
                                </p>
                                <p>
                                    FuryStack contains all the basic parts that you need to start with - like DI/IOC, authentication, data stores, entity authorization, logging, etc... -
                                    If you want to use only a subset of the layers (e.g. only the the Dependency Injection) you can also pick the one you like.
                                </p>
                                <p>
                                    In FuryStack, there are some concepts that are not very common nowdays - like sharing REST API definitions
                                    with type checking between the service and the frontend in a monorepo.
                                </p>

                            </div>
                        </PostFullContent>
                    </article>
                </div>
            </main>
            <Footer />
        </Wrapper>
    </IndexLayout>
}

export default PackagesPage