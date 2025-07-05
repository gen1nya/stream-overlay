import styled from "styled-components";

// deprecated
// use Spacer instead
export default function Separator() {
    return <hr style={{
        padding: "2px 4px",
        width: "100%",
        height: "1px",
        border: "none",
    }} />;
}


export const Spacer = styled.div`
    flex: 1;
`;