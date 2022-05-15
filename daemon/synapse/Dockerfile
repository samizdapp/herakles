FROM matrixdotorg/synapse:v1.49.2

COPY start.sh /start.sh
RUN chmod +x /start.sh

WORKDIR /

ENTRYPOINT [ "/start.sh" ]