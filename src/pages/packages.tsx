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

const StatusBadge: React.FC<{ packageName: string }> = ({ packageName }) => <a href={`https://www.npmjs.com/package/${packageName}`} target="_blank">
    <img style={{ display: 'inline' }} src={`https://img.shields.io/npm/v/${packageName}.svg?maxAge=3600`} alt={packageName} />
</a>

const TableRow: React.FC<{ packageName: string }> = ({ packageName }) => <tr>
    <td>{packageName}</td>
    <td><StatusBadge packageName={packageName} /></td>
    <td style={{ textAlign: 'center' }}>
        <a style={{ textDecoration: 'none', boxShadow: 'none', fontSize: '1.3em' }} href={`/tags/${packageName.split('/')[1]}`}>👉</a>
    </td>
</tr>


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
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>NPM link</th>
                                            <th>Related posts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <TableRow packageName="@furystack/auth-google" />
                                        <TableRow packageName="@furystack/core" />
                                        <TableRow packageName="@furystack/filesystem-store" />
                                        <TableRow packageName="@furystack/inject" />
                                        <TableRow packageName="@furystack/logging" />
                                        <TableRow packageName="@furystack/mongodb-store" />
                                        <TableRow packageName="@furystack/redis-store" />
                                        <TableRow packageName="@furystack/repository" />
                                        <TableRow packageName="@furystack/rest" />
                                        <TableRow packageName="@furystack/rest-client-fetch" />
                                        <TableRow packageName="@furystack/rest-client-got" />
                                        <TableRow packageName="@furystack/rest-service" />
                                        <TableRow packageName="@furystack/sequelize-store" />
                                        <TableRow packageName="@furystack/shades" />
                                        <TableRow packageName="@furystack/shades-common-components" />
                                        <TableRow packageName="@furystack/shades-lottie" />
                                        <TableRow packageName="@furystack/shades-nipple" />
                                        <TableRow packageName="@furystack/utils" />
                                        <TableRow packageName="@furystack/websocket-api" />
                                    </tbody>
                                </table>
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