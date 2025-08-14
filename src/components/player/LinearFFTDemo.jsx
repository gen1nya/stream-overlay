import styled from "styled-components";
import React from "react";
import FFTBars from "./FFTBars";

const FFTWrapper = styled.div`
  top: 0;
  left: 0;
  width: 1280px;
  height: 350px;
  overflow: hidden;
  position: absolute;
  z-index: -1;
  background: transparent;
`;

export default function LinearFFTDemo() {

    return (
        <FFTWrapper>
            <FFTBars
                bars={256}
                innerRadiusRatio={0.87}
                startAngle={-Math.PI}
                backgroundColor={"rgba(0,0,0,0.00)"}
            />
        </FFTWrapper>
    )
}