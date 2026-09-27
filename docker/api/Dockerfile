# Laravel API image: php-fpm (api), queue worker and scheduler share this image.
FROM php:8.4-fpm-alpine AS base

RUN apk add --no-cache icu-libs libpq libzip postgresql-client \
 && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libpq-dev libzip-dev \
 && docker-php-ext-install -j"$(nproc)" bcmath intl opcache pcntl pdo_pgsql zip \
 && pecl install redis && docker-php-ext-enable redis \
 && apk del .build-deps

COPY docker/api/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/api

FROM base AS vendor
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

FROM base AS app
COPY --from=vendor /var/www/api/vendor ./vendor
COPY apps/api ./
RUN composer dump-autoload --optimize --no-dev \
 && rm -f .env \
 && chown -R www-data:www-data storage bootstrap/cache
USER www-data
EXPOSE 9000
CMD ["php-fpm"]

# Development target: includes dev dependencies (Pest, Pint, Larastan).
FROM base AS dev
COPY apps/api ./
RUN composer install --prefer-dist --no-interaction && chown -R www-data:www-data storage bootstrap/cache
CMD ["php-fpm"]
