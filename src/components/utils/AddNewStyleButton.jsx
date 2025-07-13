import styled from "styled-components";

const ButtonBackground = styled.div`
    display: flex;
    width: calc(100%);
    margin: ${({ margin }) => margin || "12px 6px 0 6px"};
    height: ${({ height }) => height || "100px"};
    justify-content: center;
    align-items: center;
    background: rgba(136, 83, 242, 0.11);
    border: #8853F2 2px dashed;
    border-radius: 12px;
    padding: 0 12px;
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    cursor: pointer;
`;

const Text = styled.div`
    font-size: 1.2rem;
    color: #8853F2;
    font-weight: 400;
    text-align: center;
`;

export default function AddNewStyleButton({
                                              onClick = () => {},
                                              height = "100px",
                                              margin = "12px 6px 0 6px",
                                              text = "+ Добавить еще",
                                          } = {}) {
    return (
        <ButtonBackground onClick={onClick} height={height} margin={margin}>
            <Text>{text}</Text>
        </ButtonBackground>
    );
}
