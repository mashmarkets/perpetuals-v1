import { NextPageContext } from "next";
import dynamic from "next/dynamic";

// The dynamic import probably isn't required but I'm sick of dealing with this issue.
const NextError = dynamic(() => import("next/error"), { ssr: false });

function Error({ statusCode }: { statusCode: number }) {
  return <NextError statusCode={statusCode} />;
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
