import {
  Html,
  Body,
  Container,
  Text,
  Hr,
  Heading,
} from "@react-email/components";

interface AppointmentEmailProps {
  body: string;
  businessName: string;
}

export function AppointmentEmail({ body, businessName }: AppointmentEmailProps) {
  const lines = body.split("\n");

  return (
    <Html lang="es">
      <Body
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          backgroundColor: "#f5f5f5",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "24px auto",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "32px",
            border: "1px solid #e5e5e5",
          }}
        >
          <Heading
            style={{
              color: "#14143A",
              fontSize: "20px",
              fontWeight: "700",
              margin: "0 0 16px",
            }}
          >
            {businessName}
          </Heading>
          <Hr style={{ borderColor: "#e5e5e5", margin: "0 0 20px" }} />
          {lines.map((line, i) => (
            <Text
              key={i}
              style={{
                color: "#333333",
                fontSize: "15px",
                lineHeight: "1.6",
                margin: line === "" ? "8px 0" : "2px 0",
              }}
            >
              {line || " "}
            </Text>
          ))}
        </Container>
      </Body>
    </Html>
  );
}
