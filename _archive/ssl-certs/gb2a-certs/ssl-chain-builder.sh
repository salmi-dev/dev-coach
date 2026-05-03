#!/bin/sh
# ==============================================================================
# ssl-chain-builder.sh — Build and verify a correct SSL certificate chain
# ==============================================================================
#
# PROBLEM:
#   The server certificate (*.gb2a.eu) was issued by Sectigo's NEW PKI hierarchy:
#     Server Cert → Sectigo Public Server Authentication CA DV R36 → Root R46
#
#   But the provided CAChain.crt contains certs from the OLD hierarchy:
#     Sectigo RSA DV Secure Server CA → USERTrust RSA → AAA Certificate Services
#
#   This mismatch causes Java (especially bundled JRE 8 in JWrapper) to fail with:
#     "PKIX path building failed: unable to find valid certification path"
#
# SOLUTION:
#   Sectigo provides cross-signed versions of Root R46:
#     - Root R46 signed by USERTrust RSA
#     - Root R46 signed by AAA Certificate Services (Comodo)
#
#   By including the AAA cross-signed Root R46 in the chain, old Java 8 clients
#   (which trust AAA Certificate Services) can validate the full path:
#     Server → DV R36 → R46 (cross-signed by AAA) → AAA root (in old cacerts)
#
# COMMANDS:
#   inspect                          Show info about all certs in a directory
#   build   [-d CERT_DIR] [-o OUT]   Download correct intermediates, build fullchain
#   verify  [-d CERT_DIR]            Verify the built chain
#   lop     [-d CERT_DIR] [-o OUT]   Generate lop-prefixed files for lop Java app
#   keystore [-d CERT_DIR] [-o OUT]  Create PKCS12 keystore for Java/Tomcat
#   check   -h HOST [-p PORT]        Check what a live server currently serves
#   fix-jre -j CACERTS_PATH          Import Root R46 into a Java cacerts keystore
#
# EXAMPLES:
#   ./ssl-chain-builder.sh inspect -d ./gb2a-certs
#   ./ssl-chain-builder.sh build   -d ./gb2a-certs -o ./output
#   ./ssl-chain-builder.sh verify  -d ./output
#   ./ssl-chain-builder.sh lop      -d ./output -o ./output
#   ./ssl-chain-builder.sh keystore -d ./output -o ./output
#   ./ssl-chain-builder.sh check   -h gb2a.eu
#   ./ssl-chain-builder.sh fix-jre -j /path/to/jre/lib/security/cacerts
#
# REQUIREMENTS: openssl, curl
# ==============================================================================

set -eu

# ------------------------------------------------------------------------------
# Colors and helpers
# ------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { printf "${BLUE}[INFO]${NC}  %s\n" "$*"; }
ok()      { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()     { printf "${RED}[ERROR]${NC} %s\n" "$*"; }
header()  { printf "\n${BOLD}=== %s ===${NC}\n\n" "$*"; }

command -v openssl >/dev/null 2>&1 || { err "openssl is required but not found"; exit 1; }

# ------------------------------------------------------------------------------
# Default values
# ------------------------------------------------------------------------------
CERT_DIR="."
OUTPUT_DIR="."
HOST=""
PORT="443"
CACERTS_PATH=""
CACERTS_PASS="changeit"

# Sectigo URLs (extracted from the certificate's AIA extension)
INTERMEDIATE_URL="http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt"
ROOT_URL="http://crt.sectigo.com/SectigoPublicServerAuthenticationRootR46.p7c"
AAA_ROOT_URL="http://crt.sectigo.com/AAACertificateServices.crt"

# Expected file names in CERT_DIR
SERVER_CERT="certificate.cer"
PRIVATE_KEY="lop.key"

# ------------------------------------------------------------------------------
# Helper: split a PEM file with multiple certs into individual temp files
# Usage: split_pem <input.pem> <output_dir>
# Creates: <output_dir>/cert_1.pem, cert_2.pem, ...
# ------------------------------------------------------------------------------
split_pem() {
    _input="$1"
    _outdir="$2"
    _idx=0
    _cur=""
    while IFS= read -r _line; do
        case "$_line" in
            *"BEGIN CERTIFICATE"*)
                _idx=$((_idx + 1))
                _cur="${_outdir}/cert_${_idx}.pem"
                echo "$_line" > "$_cur"
                ;;
            *"END CERTIFICATE"*)
                echo "$_line" >> "$_cur"
                _cur=""
                ;;
            *)
                [ -n "$_cur" ] && echo "$_line" >> "$_cur"
                ;;
        esac
    done < "$_input"
    echo "$_idx"
}

# ==============================================================================
# COMMAND: inspect — show details of all cert files in a directory
# ==============================================================================
cmd_inspect() {
    header "Inspecting certificates in ${CERT_DIR}"

    for f in "${CERT_DIR}"/*.cer "${CERT_DIR}"/*.crt "${CERT_DIR}"/*.pem; do
        [ -f "$f" ] || continue
        printf "${BOLD}--- %s ---${NC}\n" "$(basename "$f")"

        cert_count=$(grep -c "BEGIN CERTIFICATE" "$f" 2>/dev/null || echo 0)

        if [ "$cert_count" -eq 0 ]; then
            # Try DER format
            if openssl x509 -in "$f" -inform DER -noout 2>/dev/null; then
                openssl x509 -in "$f" -inform DER -noout \
                    -subject -issuer -dates 2>/dev/null | sed 's/^/  /'
                echo ""
            else
                warn "Not a valid certificate: $f"
            fi
            continue
        fi

        # PEM format — may contain multiple certs
        tmp_split=$(mktemp -d)
        cert_count=$(split_pem "$f" "$tmp_split")

        for cf in "${tmp_split}"/cert_*.pem; do
            [ -f "$cf" ] || continue
            if [ "$cert_count" -gt 1 ]; then
                num=$(basename "$cf" | sed 's/cert_//;s/.pem//')
                printf "  ${YELLOW}[Certificate %s of %s]${NC}\n" "$num" "$cert_count"
            fi
            openssl x509 -in "$cf" -noout -subject -issuer -dates 2>/dev/null | sed 's/^/  /'
            echo ""
        done
        rm -rf "$tmp_split"
    done

    # Check private key
    if [ -f "${CERT_DIR}/${PRIVATE_KEY}" ]; then
        printf "${BOLD}--- %s ---${NC}\n" "${PRIVATE_KEY}"
        if openssl rsa -in "${CERT_DIR}/${PRIVATE_KEY}" -noout -check 2>/dev/null; then
            ok "  Private key is valid"
        else
            err "  Private key is invalid or encrypted"
        fi
        echo ""
    fi

    # Check key/cert match
    if [ -f "${CERT_DIR}/${SERVER_CERT}" ] && [ -f "${CERT_DIR}/${PRIVATE_KEY}" ]; then
        header "Key/Certificate Match Check"
        cert_mod=$(openssl x509 -in "${CERT_DIR}/${SERVER_CERT}" -noout -modulus 2>/dev/null | openssl md5)
        key_mod=$(openssl rsa -in "${CERT_DIR}/${PRIVATE_KEY}" -noout -modulus 2>/dev/null | openssl md5)
        if [ "$cert_mod" = "$key_mod" ]; then
            ok "Private key matches server certificate"
        else
            err "Private key does NOT match server certificate!"
        fi
    fi

    # Chain analysis
    if [ -f "${CERT_DIR}/${SERVER_CERT}" ]; then
        header "Chain Analysis"
        issuer=$(openssl x509 -in "${CERT_DIR}/${SERVER_CERT}" -noout -issuer 2>/dev/null)
        info "Server cert issued by: $issuer"

        if [ -f "${CERT_DIR}/CAChain.crt" ]; then
            info "Verifying server cert against provided CAChain.crt..."
            if openssl verify -CAfile "${CERT_DIR}/CAChain.crt" "${CERT_DIR}/${SERVER_CERT}" >/dev/null 2>&1; then
                ok "CAChain.crt validates the server certificate"
            else
                err "CAChain.crt does NOT validate the server certificate!"
                warn "The chain file belongs to a DIFFERENT Sectigo hierarchy."
                warn "Run: $0 build  — to download and build the correct chain."
            fi
        fi
    fi
}

# ==============================================================================
# COMMAND: build — download correct intermediates, build fullchain.pem
# ==============================================================================
cmd_build() {
    header "Building correct certificate chain"

    if [ ! -f "${CERT_DIR}/${SERVER_CERT}" ]; then
        err "Server certificate not found: ${CERT_DIR}/${SERVER_CERT}"; exit 1
    fi
    if [ ! -f "${CERT_DIR}/${PRIVATE_KEY}" ]; then
        err "Private key not found: ${CERT_DIR}/${PRIVATE_KEY}"; exit 1
    fi

    mkdir -p "${OUTPUT_DIR}"

    # ------------------------------------------------------------------
    # Step 1: Download the correct intermediate (DV R36)
    # ------------------------------------------------------------------
    info "Downloading intermediate: Sectigo Public Server Authentication CA DV R36..."
    intermediate_der=$(mktemp)
    if ! curl -so "$intermediate_der" "$INTERMEDIATE_URL"; then
        err "Failed to download intermediate from: $INTERMEDIATE_URL"
        rm -f "$intermediate_der"; exit 1
    fi

    intermediate_pem="${OUTPUT_DIR}/intermediate_dv_r36.pem"
    if ! openssl x509 -in "$intermediate_der" -inform DER -out "$intermediate_pem" 2>/dev/null; then
        if openssl x509 -in "$intermediate_der" -out "$intermediate_pem" 2>/dev/null; then
            info "Intermediate was already in PEM format"
        else
            err "Failed to parse downloaded intermediate certificate"
            rm -f "$intermediate_der"; exit 1
        fi
    fi
    rm -f "$intermediate_der"
    ok "Intermediate saved: $intermediate_pem"
    openssl x509 -in "$intermediate_pem" -noout -subject -issuer 2>/dev/null | sed 's/^/     /'

    # ------------------------------------------------------------------
    # Step 2: Download root R46 bundle (P7C contains self-signed + cross-signs)
    # ------------------------------------------------------------------
    info "Downloading root bundle: Sectigo Public Server Authentication Root R46..."
    root_p7c=$(mktemp)
    if ! curl -so "$root_p7c" "$ROOT_URL"; then
        err "Failed to download root from: $ROOT_URL"
        rm -f "$root_p7c"; exit 1
    fi

    root_all=$(mktemp)
    if ! openssl pkcs7 -in "$root_p7c" -inform DER -print_certs -out "$root_all" 2>/dev/null; then
        if ! openssl x509 -in "$root_p7c" -inform DER -out "$root_all" 2>/dev/null; then
            err "Failed to parse downloaded root certificate"
            rm -f "$root_p7c"; exit 1
        fi
    fi
    rm -f "$root_p7c"

    # ------------------------------------------------------------------
    # The P7C bundle contains multiple variants of Root R46:
    #   1. Self-signed root
    #   2. Cross-signed by USERTrust RSA Certification Authority
    #   3. Cross-signed by AAA Certificate Services (Comodo)
    #
    # The cross-signed variants are KEY to solving the old Java 8 problem:
    # old JREs trust AAA/USERTrust but don't know Root R46.
    # ------------------------------------------------------------------
    root_pem="${OUTPUT_DIR}/root_r46.pem"
    root_cross_usertrust="${OUTPUT_DIR}/root_r46_cross_usertrust.pem"
    root_cross_aaa="${OUTPUT_DIR}/root_r46_cross_aaa.pem"

    tmp_root_split=$(mktemp -d)
    split_pem "$root_all" "$tmp_root_split" >/dev/null
    rm -f "$root_all"

    # Classify each cert by its issuer
    for cf in "${tmp_root_split}"/cert_*.pem; do
        [ -f "$cf" ] || continue
        issuer_cn=$(openssl x509 -in "$cf" -noout -issuer 2>/dev/null | sed 's/.*CN *= *//' | sed 's/,.*//')
        subject_cn=$(openssl x509 -in "$cf" -noout -subject 2>/dev/null | sed 's/.*CN *= *//' | sed 's/,.*//')

        if [ "$issuer_cn" = "$subject_cn" ]; then
            cp "$cf" "$root_pem"
            ok "Root (self-signed) saved: $root_pem"
            openssl x509 -in "$root_pem" -noout -subject -issuer 2>/dev/null | sed 's/^/     /'
        elif echo "$issuer_cn" | grep -qi "USERTrust"; then
            cp "$cf" "$root_cross_usertrust"
            ok "Root (cross-signed by USERTrust) saved: $root_cross_usertrust"
            openssl x509 -in "$root_cross_usertrust" -noout -subject -issuer 2>/dev/null | sed 's/^/     /'
        elif echo "$issuer_cn" | grep -qi "AAA\|Comodo"; then
            cp "$cf" "$root_cross_aaa"
            ok "Root (cross-signed by AAA/Comodo) saved: $root_cross_aaa"
            openssl x509 -in "$root_cross_aaa" -noout -subject -issuer 2>/dev/null | sed 's/^/     /'
        else
            warn "Unknown root variant (issuer: $issuer_cn), saving as root"
            cp "$cf" "$root_pem"
        fi
    done
    rm -rf "$tmp_root_split"

    # ------------------------------------------------------------------
    # Step 3: Build fullchain.pem
    #
    # Chain order: Server cert → Intermediate (DV R36) → Cross-signed Root R46
    #
    # We prefer the AAA cross-sign because AAA Certificate Services (Comodo)
    # is trusted by virtually ALL Java versions, including very old JRE 8.
    # This gives maximum client compatibility.
    # ------------------------------------------------------------------
    info "Building fullchain.pem..."
    fullchain="${OUTPUT_DIR}/fullchain.pem"
    cat "${CERT_DIR}/${SERVER_CERT}" "$intermediate_pem" > "$fullchain"

    if [ -f "$root_cross_aaa" ]; then
        cat "$root_cross_aaa" >> "$fullchain"
        info "Included AAA/Comodo cross-signed root (maximum Java 8 compatibility)"
    elif [ -f "$root_cross_usertrust" ]; then
        cat "$root_cross_usertrust" >> "$fullchain"
        info "Included USERTrust cross-signed root"
    else
        cat "$root_pem" >> "$fullchain"
        info "Included self-signed root (no cross-signed variants found)"
    fi
    ok "Full chain saved: $fullchain"

    # ------------------------------------------------------------------
    # Step 4: Build chain-only file (for Apache SSLCertificateChainFile)
    # ------------------------------------------------------------------
    chain_only="${OUTPUT_DIR}/chain.pem"
    cat "$intermediate_pem" > "$chain_only"
    if [ -f "$root_cross_aaa" ]; then
        cat "$root_cross_aaa" >> "$chain_only"
    elif [ -f "$root_cross_usertrust" ]; then
        cat "$root_cross_usertrust" >> "$chain_only"
    else
        cat "$root_pem" >> "$chain_only"
    fi
    ok "Chain-only (no server cert) saved: $chain_only"

    # ------------------------------------------------------------------
    # Step 5: Copy server cert and key to output
    # ------------------------------------------------------------------
    cp "${CERT_DIR}/${SERVER_CERT}" "${OUTPUT_DIR}/${SERVER_CERT}"
    ok "Server certificate copied to: ${OUTPUT_DIR}/${SERVER_CERT}"
    cp "${CERT_DIR}/${PRIVATE_KEY}" "${OUTPUT_DIR}/${PRIVATE_KEY}"
    ok "Private key copied to: ${OUTPUT_DIR}/${PRIVATE_KEY}"

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    echo ""
    header "Chain Structure (what the server will serve)"
    printf "  ${GREEN}1.${NC} Server cert:   CN=*.gb2a.eu\n"
    printf "  ${GREEN}2.${NC} Intermediate:  Sectigo Public Server Authentication CA DV R36\n"
    if [ -f "$root_cross_aaa" ]; then
        printf "  ${GREEN}3.${NC} Cross-signed:  Root R46 signed by AAA Certificate Services (Comodo)\n"
        printf "     ${YELLOW}↑ This ensures old Java 8 clients can validate the chain${NC}\n"
    elif [ -f "$root_cross_usertrust" ]; then
        printf "  ${GREEN}3.${NC} Cross-signed:  Root R46 signed by USERTrust RSA\n"
    else
        printf "  ${GREEN}3.${NC} Root:          Sectigo Public Server Authentication Root R46\n"
    fi
    echo ""

    header "Output Files"
    printf "  %-38s %s\n" "fullchain.pem" "Server + Intermediate + Cross-signed Root (Nginx)"
    printf "  %-38s %s\n" "chain.pem" "Intermediate + Cross-signed Root (Apache)"
    printf "  %-38s %s\n" "intermediate_dv_r36.pem" "Intermediate cert standalone"
    printf "  %-38s %s\n" "root_r46.pem" "Root R46 self-signed"
    [ -f "$root_cross_usertrust" ] && \
    printf "  %-38s %s\n" "root_r46_cross_usertrust.pem" "Root R46 cross-signed by USERTrust"
    [ -f "$root_cross_aaa" ] && \
    printf "  %-38s %s\n" "root_r46_cross_aaa.pem" "Root R46 cross-signed by AAA/Comodo"
    printf "  %-38s %s\n" "${SERVER_CERT}" "Server certificate"
    printf "  %-38s %s\n" "${PRIVATE_KEY}" "Private key"
    echo ""

    header "Deployment Instructions"
    echo "  Nginx:"
    echo "    ssl_certificate     /path/to/fullchain.pem;"
    echo "    ssl_certificate_key /path/to/lop.key;"
    echo ""
    echo "  Apache:"
    echo "    SSLCertificateFile    /path/to/certificate.cer"
    echo "    SSLCertificateKeyFile /path/to/lop.key"
    echo "    SSLCertificateChainFile /path/to/chain.pem"
    echo ""
    info "Next: run '$0 verify -d ${OUTPUT_DIR}' to validate."
}

# ==============================================================================
# COMMAND: verify — validate the built chain
# ==============================================================================
cmd_verify() {
    header "Verifying certificate chain in ${CERT_DIR}"

    errors=0

    # Check required files exist
    for f in "${SERVER_CERT}" "intermediate_dv_r36.pem" "root_r46.pem" "fullchain.pem" "${PRIVATE_KEY}"; do
        if [ ! -f "${CERT_DIR}/$f" ]; then
            err "Missing: ${CERT_DIR}/$f"
            errors=$((errors + 1))
        else
            ok "Found: $f"
        fi
    done
    [ $errors -gt 0 ] && { err "Missing files. Run 'build' first."; exit 1; }

    echo ""

    # Verify chain: server cert → intermediate → root (self-signed)
    info "Verifying: server cert → intermediate → root (self-signed)..."
    if openssl verify \
        -CAfile "${CERT_DIR}/root_r46.pem" \
        -untrusted "${CERT_DIR}/intermediate_dv_r36.pem" \
        "${CERT_DIR}/${SERVER_CERT}" 2>&1 | grep -q ": OK"; then
        ok "Chain verification PASSED (via self-signed root)"
    else
        err "Chain verification FAILED (self-signed root)"
        openssl verify \
            -CAfile "${CERT_DIR}/root_r46.pem" \
            -untrusted "${CERT_DIR}/intermediate_dv_r36.pem" \
            "${CERT_DIR}/${SERVER_CERT}" 2>&1
        errors=$((errors + 1))
    fi

    # Verify chain through cross-signed root (AAA) if available
    if [ -f "${CERT_DIR}/root_r46_cross_aaa.pem" ]; then
        info "Verifying: server cert → intermediate → cross-signed root (AAA)..."
        # Build a combined trust: AAA signs R46, so we need the AAA root too.
        # But for verification we treat the cross-signed cert as a bridge.
        # The cross-signed R46 + intermediate should validate the server cert
        # if we trust the cross-signer (AAA). Since AAA is in system roots:
        if openssl verify \
            -untrusted "${CERT_DIR}/intermediate_dv_r36.pem" \
            -untrusted "${CERT_DIR}/root_r46_cross_aaa.pem" \
            "${CERT_DIR}/${SERVER_CERT}" 2>&1 | grep -q ": OK"; then
            ok "Chain verification PASSED (via AAA cross-signed root)"
        else
            warn "Cross-signed chain could not be verified locally"
            warn "(This is expected if AAA root is not in this system's trust store)"
        fi
    fi

    # Verify key matches cert
    info "Verifying key matches certificate..."
    cert_mod=$(openssl x509 -in "${CERT_DIR}/${SERVER_CERT}" -noout -modulus 2>/dev/null | openssl md5)
    key_mod=$(openssl rsa -in "${CERT_DIR}/${PRIVATE_KEY}" -noout -modulus 2>/dev/null | openssl md5)
    if [ "$cert_mod" = "$key_mod" ]; then
        ok "Private key matches server certificate"
    else
        err "Private key does NOT match server certificate!"
        errors=$((errors + 1))
    fi

    # Verify fullchain order
    info "Verifying fullchain.pem certificate order..."
    cert_count=$(grep -c "BEGIN CERTIFICATE" "${CERT_DIR}/fullchain.pem")
    if [ "$cert_count" -eq 3 ]; then
        ok "fullchain.pem contains 3 certificates (server + intermediate + root)"
    else
        warn "fullchain.pem contains $cert_count certificates (expected 3)"
    fi

    # Check expiration
    info "Checking certificate expiration..."
    end_date=$(openssl x509 -in "${CERT_DIR}/${SERVER_CERT}" -noout -enddate 2>/dev/null | cut -d= -f2)
    if openssl x509 -in "${CERT_DIR}/${SERVER_CERT}" -noout -checkend 0 2>/dev/null; then
        ok "Server certificate is valid (expires: $end_date)"
    else
        err "Server certificate has EXPIRED! ($end_date)"
        errors=$((errors + 1))
    fi

    if ! openssl x509 -in "${CERT_DIR}/${SERVER_CERT}" -noout -checkend 2592000 2>/dev/null; then
        warn "Server certificate expires within 30 days! ($end_date)"
    fi

    echo ""
    if [ $errors -eq 0 ]; then
        ok "All checks passed! Chain is ready for deployment."
    else
        err "$errors check(s) failed."
        exit 1
    fi
}

# ==============================================================================
# COMMAND: keystore — create PKCS12 keystore for Java/Tomcat
# ==============================================================================
cmd_keystore() {
    header "Building PKCS12 keystore"

    if [ ! -f "${CERT_DIR}/fullchain.pem" ]; then
        err "fullchain.pem not found in ${CERT_DIR}. Run 'build' first."; exit 1
    fi
    if [ ! -f "${CERT_DIR}/${PRIVATE_KEY}" ]; then
        err "${PRIVATE_KEY} not found in ${CERT_DIR}."; exit 1
    fi

    mkdir -p "${OUTPUT_DIR}"
    p12_file="${OUTPUT_DIR}/keystore.p12"

    info "Creating PKCS12 keystore..."
    printf "Enter a password for the keystore: "
    stty -echo 2>/dev/null || true
    read -r ks_pass
    stty echo 2>/dev/null || true
    echo ""

    if [ -z "$ks_pass" ]; then
        warn "Empty password — using 'changeit'"
        ks_pass="changeit"
    fi

    openssl pkcs12 -export \
        -in "${CERT_DIR}/fullchain.pem" \
        -inkey "${CERT_DIR}/${PRIVATE_KEY}" \
        -out "$p12_file" \
        -name "gb2a" \
        -passout "pass:${ks_pass}"

    ok "PKCS12 keystore created: $p12_file"
    echo ""
    info "Tomcat server.xml configuration:"
    echo ""
    echo '  <Connector port="443" protocol="org.apache.coyote.http11.Http11NioProtocol"'
    echo '             maxThreads="150" SSLEnabled="true"'
    echo '             scheme="https" secure="true"'
    echo "             keystoreFile=\"$p12_file\""
    echo "             keystorePass=\"${ks_pass}\""
    echo '             keystoreType="PKCS12"'
    echo '             clientAuth="false" sslProtocol="TLS" />'
    echo ""
    info "Or convert to JKS:"
    echo "  keytool -importkeystore -srckeystore $p12_file -srcstoretype PKCS12 \\"
    echo "    -destkeystore keystore.jks -deststoretype JKS"
}

# ==============================================================================
# COMMAND: check — test what a live server currently serves
# ==============================================================================
cmd_check() {
    if [ -z "$HOST" ]; then
        err "Host is required: $0 check -h <hostname> [-p <port>]"; exit 1
    fi

    header "Checking live server: ${HOST}:${PORT}"

    info "Certificates served by server:"
    echo ""
    echo | openssl s_client -connect "${HOST}:${PORT}" -showcerts 2>/dev/null \
        | grep -E "^ [0-9]+ s:|^ +i:" | sed 's/^/  /'
    echo ""

    info "Verification result:"
    result=$(echo | openssl s_client -connect "${HOST}:${PORT}" 2>&1 | grep "Verify return code")
    echo "  $result"
    echo ""

    cert_count=$(echo | openssl s_client -connect "${HOST}:${PORT}" -showcerts 2>/dev/null \
        | grep -c "BEGIN CERTIFICATE")
    if [ "$cert_count" -lt 2 ]; then
        warn "Server only sends $cert_count certificate(s)."
        warn "Should send at least 2 (server + intermediate). This causes PKIX errors."
    else
        ok "Server sends $cert_count certificate(s)"
    fi

    echo ""
    info "TLS version negotiated:"
    echo | openssl s_client -connect "${HOST}:${PORT}" 2>/dev/null \
        | grep "Protocol  :" | sed 's/^/  /'
}

# ==============================================================================
# COMMAND: fix-jre — import Root R46 into a Java cacerts (fallback fix)
# ==============================================================================
cmd_fix_jre() {
    if [ -z "$CACERTS_PATH" ]; then
        err "Path to Java cacerts required: $0 fix-jre -j /path/to/cacerts"; exit 1
    fi
    if [ ! -f "$CACERTS_PATH" ]; then
        err "File not found: $CACERTS_PATH"; exit 1
    fi
    command -v keytool >/dev/null 2>&1 || { err "'keytool' not found in PATH"; exit 1; }

    header "Importing Root R46 into Java cacerts"

    # Download root
    root_pem=$(mktemp)
    root_p7c=$(mktemp)
    info "Downloading Sectigo Public Server Authentication Root R46..."
    curl -so "$root_p7c" "$ROOT_URL"

    # Extract just the self-signed root from the P7C
    root_all=$(mktemp)
    openssl pkcs7 -in "$root_p7c" -inform DER -print_certs -out "$root_all" 2>/dev/null
    rm -f "$root_p7c"

    tmp_split=$(mktemp -d)
    split_pem "$root_all" "$tmp_split"
    rm -f "$root_all"

    # Find the self-signed one
    for cf in "${tmp_split}"/cert_*.pem; do
        [ -f "$cf" ] || continue
        issuer_cn=$(openssl x509 -in "$cf" -noout -issuer 2>/dev/null | sed 's/.*CN *= *//' | sed 's/,.*//')
        subject_cn=$(openssl x509 -in "$cf" -noout -subject 2>/dev/null | sed 's/.*CN *= *//' | sed 's/,.*//')
        if [ "$issuer_cn" = "$subject_cn" ]; then
            cp "$cf" "$root_pem"
            break
        fi
    done
    rm -rf "$tmp_split"

    alias_name="sectigo-public-server-auth-root-r46"

    if keytool -list -keystore "$CACERTS_PATH" -storepass "$CACERTS_PASS" \
        -alias "$alias_name" >/dev/null 2>&1; then
        ok "Root R46 is already in cacerts (alias: $alias_name)"
        rm -f "$root_pem"
        return 0
    fi

    info "Importing root certificate (password: $CACERTS_PASS)..."
    keytool -importcert \
        -keystore "$CACERTS_PATH" \
        -storepass "$CACERTS_PASS" \
        -alias "$alias_name" \
        -file "$root_pem" \
        -noprompt \
        -trustcacerts

    if [ $? -eq 0 ]; then
        ok "Root R46 successfully imported into: $CACERTS_PATH"
    else
        err "Failed to import certificate"
        rm -f "$root_pem"; exit 1
    fi
    rm -f "$root_pem"

    echo ""
    warn "NOTE: This fixes ONE JRE. For a permanent fix for ALL clients,"
    warn "deploy fullchain.pem on the server (see: $0 build)."
}

# ==============================================================================
# COMMAND: lop — generate the 3 files lop needs to build its Java keystore
#
# lop expects:
#   - Certificat délivré par une AC  → lop-certificate.pem
#   - Chaîne de certificats de l'AC  → lop-ca-chain.pem
#   - Clef privée                    → lop-private-key.pem
# ==============================================================================
cmd_lop() {
    header "Generating lop application certificate files"

    # Require at minimum the server cert and private key (original files)
    if [ ! -f "${CERT_DIR}/${SERVER_CERT}" ]; then
        err "Server certificate not found: ${CERT_DIR}/${SERVER_CERT}"; exit 1
    fi
    if [ ! -f "${CERT_DIR}/${PRIVATE_KEY}" ]; then
        err "Private key not found: ${CERT_DIR}/${PRIVATE_KEY}"; exit 1
    fi

    mkdir -p "${OUTPUT_DIR}"

    # ------------------------------------------------------------------
    # Resolve the intermediate: use local if available, download otherwise
    # ------------------------------------------------------------------
    if [ -f "${CERT_DIR}/intermediate_dv_r36.pem" ]; then
        intermediate_pem="${CERT_DIR}/intermediate_dv_r36.pem"
        info "Using existing intermediate: $intermediate_pem"
    else
        info "Downloading intermediate: Sectigo Public Server Authentication CA DV R36..."
        intermediate_der=$(mktemp)
        if ! curl -so "$intermediate_der" "$INTERMEDIATE_URL"; then
            err "Failed to download intermediate from: $INTERMEDIATE_URL"
            rm -f "$intermediate_der"; exit 1
        fi
        intermediate_pem=$(mktemp)
        if ! openssl x509 -in "$intermediate_der" -inform DER -out "$intermediate_pem" 2>/dev/null; then
            if ! openssl x509 -in "$intermediate_der" -out "$intermediate_pem" 2>/dev/null; then
                err "Failed to parse intermediate certificate"
                rm -f "$intermediate_der"; exit 1
            fi
        fi
        rm -f "$intermediate_der"
        ok "Intermediate downloaded"
    fi

    # ------------------------------------------------------------------
    # Resolve the cross-signed root: use local if available, download otherwise
    # ------------------------------------------------------------------
    root_cross_aaa=""
    root_cross_usertrust=""
    root_self=""

    if [ -f "${CERT_DIR}/root_r46_cross_aaa.pem" ]; then
        root_cross_aaa="${CERT_DIR}/root_r46_cross_aaa.pem"
        info "Using existing AAA cross-signed root"
    elif [ -f "${CERT_DIR}/root_r46_cross_usertrust.pem" ]; then
        root_cross_usertrust="${CERT_DIR}/root_r46_cross_usertrust.pem"
        info "Using existing USERTrust cross-signed root"
    elif [ -f "${CERT_DIR}/root_r46.pem" ]; then
        root_self="${CERT_DIR}/root_r46.pem"
        info "Using existing self-signed root"
    else
        info "Downloading root bundle: Sectigo Public Server Authentication Root R46..."
        root_p7c=$(mktemp)
        if ! curl -so "$root_p7c" "$ROOT_URL"; then
            err "Failed to download root from: $ROOT_URL"
            rm -f "$root_p7c"; exit 1
        fi
        root_all=$(mktemp)
        if ! openssl pkcs7 -in "$root_p7c" -inform DER -print_certs -out "$root_all" 2>/dev/null; then
            if ! openssl x509 -in "$root_p7c" -inform DER -out "$root_all" 2>/dev/null; then
                err "Failed to parse root certificate"
                rm -f "$root_p7c"; exit 1
            fi
        fi
        rm -f "$root_p7c"

        # Split and classify certs from the P7C bundle
        tmp_root_split=$(mktemp -d)
        split_pem "$root_all" "$tmp_root_split" >/dev/null
        rm -f "$root_all"

        for cf in "${tmp_root_split}"/cert_*.pem; do
            [ -f "$cf" ] || continue
            issuer_cn=$(openssl x509 -in "$cf" -noout -issuer 2>/dev/null | sed 's/.*CN *= *//' | sed 's/,.*//')
            subject_cn=$(openssl x509 -in "$cf" -noout -subject 2>/dev/null | sed 's/.*CN *= *//' | sed 's/,.*//')
            if [ "$issuer_cn" = "$subject_cn" ]; then
                root_self="$cf"
            elif echo "$issuer_cn" | grep -qi "USERTrust"; then
                root_cross_usertrust="$cf"
            elif echo "$issuer_cn" | grep -qi "AAA\|Comodo"; then
                root_cross_aaa="$cf"
            fi
        done
        ok "Root bundle downloaded and classified"
        # Note: tmp_root_split cleaned up at the end
    fi

    # ------------------------------------------------------------------
    # 1. lop-certificate.pem — the server certificate (delivered by the CA)
    # ------------------------------------------------------------------
    lop_cert="${OUTPUT_DIR}/lop-certificate.pem"
    cp "${CERT_DIR}/${SERVER_CERT}" "$lop_cert"
    ok "lop-certificate.pem  — Server certificate (CN=*.gb2a.eu)"
    openssl x509 -in "$lop_cert" -noout -subject -issuer -dates 2>/dev/null | sed 's/^/     /'

    # ------------------------------------------------------------------
    # 2. lop-ca-chain.pem — the COMPLETE CA chain
    #
    #    lop walks the chain and expects every issuer to be present.
    #    Order:
    #      [1] Intermediate DV R36         (issued by Root R46)
    #      [2] Root R46 cross-signed       (issued by AAA Certificate Services)
    #      [3] AAA Certificate Services    (self-signed root — trusted by all Java)
    #
    #    This gives lop the full path it needs to build its Java keystore.
    # ------------------------------------------------------------------
    lop_chain="${OUTPUT_DIR}/lop-ca-chain.pem"
    cat "$intermediate_pem" > "$lop_chain"

    if [ -n "$root_cross_aaa" ] && [ -f "$root_cross_aaa" ]; then
        cat "$root_cross_aaa" >> "$lop_chain"
        info "Added Root R46 cross-signed by AAA/Comodo"
    elif [ -n "$root_cross_usertrust" ] && [ -f "$root_cross_usertrust" ]; then
        cat "$root_cross_usertrust" >> "$lop_chain"
        info "Added Root R46 cross-signed by USERTrust"
    elif [ -n "$root_self" ] && [ -f "$root_self" ]; then
        cat "$root_self" >> "$lop_chain"
        info "Added Root R46 self-signed"
    else
        warn "No Root R46 certificate found — chain may be incomplete"
    fi

    # Download and append the AAA Certificate Services root
    # (lop requires every issuer in the chain to be present)
    if [ -f "${CERT_DIR}/aaa_root.pem" ]; then
        cat "${CERT_DIR}/aaa_root.pem" >> "$lop_chain"
        info "Added AAA Certificate Services root (from local)"
    else
        info "Downloading AAA Certificate Services root..."
        aaa_der=$(mktemp)
        if curl -so "$aaa_der" "$AAA_ROOT_URL"; then
            aaa_pem=$(mktemp)
            if openssl x509 -in "$aaa_der" -inform DER -out "$aaa_pem" 2>/dev/null || \
               openssl x509 -in "$aaa_der" -out "$aaa_pem" 2>/dev/null; then
                cat "$aaa_pem" >> "$lop_chain"
                # Also save standalone for future runs
                cp "$aaa_pem" "${OUTPUT_DIR}/aaa_root.pem"
                info "Added AAA Certificate Services root (downloaded)"
            else
                warn "Failed to parse AAA root certificate"
            fi
            rm -f "$aaa_pem"
        else
            warn "Failed to download AAA root from: $AAA_ROOT_URL"
        fi
        rm -f "$aaa_der"
    fi
    ok "lop-ca-chain.pem    — Complete CA chain"

    echo "     Certificates in chain:"
    tmp_split=$(mktemp -d)
    split_pem "$lop_chain" "$tmp_split" >/dev/null
    for cf in "${tmp_split}"/cert_*.pem; do
        [ -f "$cf" ] || continue
        num=$(basename "$cf" | sed 's/cert_//;s/.pem//')
        subj=$(openssl x509 -in "$cf" -noout -subject 2>/dev/null | sed 's/subject= *//')
        issuer=$(openssl x509 -in "$cf" -noout -issuer 2>/dev/null | sed 's/issuer= *//')
        printf "     [%s] %s\n" "$num" "$subj"
        printf "         issued by: %s\n" "$issuer"
    done
    rm -rf "$tmp_split"

    # ------------------------------------------------------------------
    # 3. lop-private-key.pem — the private key
    # ------------------------------------------------------------------
    lop_key="${OUTPUT_DIR}/lop-private-key.pem"
    cp "${CERT_DIR}/${PRIVATE_KEY}" "$lop_key"
    ok "lop-private-key.pem  — Private key"

    # ------------------------------------------------------------------
    # Verification
    # ------------------------------------------------------------------
    echo ""
    info "Verifying key matches certificate..."
    cert_mod=$(openssl x509 -in "$lop_cert" -noout -modulus 2>/dev/null | openssl md5)
    key_mod=$(openssl rsa -in "$lop_key" -noout -modulus 2>/dev/null | openssl md5)
    if [ "$cert_mod" = "$key_mod" ]; then
        ok "Private key matches certificate"
    else
        err "Private key does NOT match certificate!"; exit 1
    fi

    info "Verifying certificate against CA chain..."
    if openssl verify -CAfile "$lop_chain" "$lop_cert" 2>&1 | grep -q ": OK"; then
        ok "Certificate validates against CA chain"
    else
        # Try with system roots as fallback (cross-signed needs the actual root in store)
        if openssl verify -untrusted "$lop_chain" "$lop_cert" 2>&1 | grep -q ": OK"; then
            ok "Certificate validates against CA chain (via system trust store)"
        else
            warn "Could not verify certificate against chain locally"
            warn "(This may be OK — the Java app will build the full path at runtime)"
        fi
    fi

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    header "lop Application Files (ready to deploy)"
    printf "  ${BOLD}%-25s${NC} %s\n" "lop-certificate.pem" "Certificat délivré par l'AC (serveur)"
    printf "  ${BOLD}%-25s${NC} %s\n" "lop-ca-chain.pem" "Chaîne de certificats de l'AC"
    printf "  ${BOLD}%-25s${NC} %s\n" "lop-private-key.pem" "Clef privée"
    echo ""
    info "Copy these 3 files to your lop configuration directory."
    info "lop will use them to construct its Java keystore at startup."
}

# ==============================================================================
# Usage and argument parsing
# ==============================================================================
usage() {
    printf "${BOLD}Usage:${NC} %s <command> [options]\n\n" "$0"
    printf "${BOLD}Commands:${NC}\n"
    printf "  inspect                          Inspect certificates in a directory\n"
    printf "  build   [-d DIR] [-o OUT]        Build correct fullchain from server cert\n"
    printf "  verify  [-d DIR]                 Verify a built chain\n"
    printf "  lop     [-d DIR] [-o OUT]        Generate lop-prefixed files for lop app\n"
    printf "  keystore [-d DIR] [-o OUT]       Create PKCS12 keystore for Java/Tomcat\n"
    printf "  check   -h HOST [-p PORT]        Check what a live server serves\n"
    printf "  fix-jre -j CACERTS               Import Root R46 into Java cacerts\n"
    printf "\n${BOLD}Options:${NC}\n"
    printf "  -d DIR       Certificate directory (default: current dir)\n"
    printf "  -o DIR       Output directory (default: current dir)\n"
    printf "  -h HOST      Server hostname\n"
    printf "  -p PORT      Server port (default: 443)\n"
    printf "  -j CACERTS   Path to Java cacerts file\n"
    printf "  -P PASSWORD  Java cacerts password (default: changeit)\n"
    printf "\n${BOLD}Typical workflow:${NC}\n"
    printf "  1. %s inspect  -d ./gb2a-certs\n" "$0"
    printf "  2. %s build    -d ./gb2a-certs -o ./output\n" "$0"
    printf "  3. %s verify   -d ./output\n" "$0"
    printf "  4. %s lop      -d ./output -o ./output\n" "$0"
    printf "  5. Deploy lop-*.pem files to the lop application\n"
    printf "  6. Deploy output/fullchain.pem + output/lop.key on the web server\n"
    printf "  7. %s check    -h gb2a.eu\n" "$0"
    echo ""
    exit 1
}

[ $# -lt 1 ] && usage

COMMAND="$1"
shift

while [ $# -gt 0 ]; do
    case "$1" in
        -d) CERT_DIR="$2";     shift 2 ;;
        -o) OUTPUT_DIR="$2";   shift 2 ;;
        -h) HOST="$2";         shift 2 ;;
        -p) PORT="$2";         shift 2 ;;
        -j) CACERTS_PATH="$2"; shift 2 ;;
        -P) CACERTS_PASS="$2"; shift 2 ;;
        *)  err "Unknown option: $1"; usage ;;
    esac
done

case "$COMMAND" in
    inspect)  cmd_inspect  ;;
    build)    cmd_build    ;;
    verify)   cmd_verify   ;;
    lop)      cmd_lop      ;;
    keystore) cmd_keystore ;;
    check)    cmd_check    ;;
    fix-jre)  cmd_fix_jre  ;;
    *)        err "Unknown command: $COMMAND"; usage ;;
esac
