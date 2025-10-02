import styled from "styled-components";
import React from "react";
import WaveForm from "./WaveForm";

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

export default function WaveformDemo() {

    return (
        <FFTWrapper>
            <WaveForm/>
        </FFTWrapper>
    )
}