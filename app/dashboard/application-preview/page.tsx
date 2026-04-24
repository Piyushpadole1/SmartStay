'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { getUserApplication } from '@/lib/firebase/firestore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, AlertCircle, XCircle, Download } from 'lucide-react'
import type { Application, ValidationStatus } from '@/lib/types'
import Link from 'next/link'

function ValidationIcon({ status }: { status: ValidationStatus }) {
  switch (status) {
    case 'verified':
      return <CheckCircle className="h-5 w-5 text-emerald-500" />
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    case 'error':
      return <XCircle className="h-5 w-5 text-destructive" />
    default:
      return <div className="h-5 w-5 bg-muted rounded" />
  }
}

export default function ApplicationPreviewPage() {
  const { user } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadApplication() {
      if (user?.uid) {
        const app = await getUserApplication(user.uid)
        setApplication(app)
      }
      setLoading(false)
    }
    loadApplication()
  }, [user?.uid])

  const downloadPDF = async () => {
    if (!application) return
    
    // Create a simple PDF-like format (can be enhanced with a library like jspdf)
    const content = `
HOSTEL APPLICATION FORM
===================================

PERSONAL INFORMATION
-----------------------------------
Name: ${application.fullName}
Email: ${application.email}
Phone: ${application.phone}
Gender: ${application.gender}
Aadhaar Number: ${application.aadhaarNumber}

ACADEMIC INFORMATION
-----------------------------------
Branch: ${application.branch}
Year: ${application.year}
Category: ${application.category}
Admission Type: ${application.admissionType}
${application.admissionType === 'CET' ? `CET Marks: ${application.cetMarks}` : `SGPA: ${application.sgpa}`}

HOSTEL PREFERENCE
-----------------------------------
Hostel Type: ${application.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel'}

APPLICATION STATUS
-----------------------------------
Status: ${application.status}
Merit Rank: ${application.meritRank || 'Not yet calculated'}
    `.trim()

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content))
    element.setAttribute('download', `application-${application.id}.txt`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No application found</p>
        <Button asChild>
          <Link href="/dashboard/application">Create Application</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Application Preview</h1>
          <p className="text-muted-foreground">Review all your application details</p>
        </div>
        <Button onClick={downloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Download Application
        </Button>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="font-semibold">{application.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-semibold capitalize">{application.gender}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-semibold">{application.email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-semibold">{application.phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aadhaar Number</p>
            <p className="font-semibold">****{application.aadhaarNumber.slice(-4)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Branch</p>
            <p className="font-semibold">{application.branch}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Year</p>
            <p className="font-semibold">{application.year}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="font-semibold">{application.category}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Admission Type</p>
            <p className="font-semibold">{application.admissionType}</p>
          </div>
          {application.cetMarks && (
            <div>
              <p className="text-sm text-muted-foreground">CET Marks</p>
              <p className="font-semibold">{application.cetMarks}</p>
            </div>
          )}
          {application.sgpa && (
            <div>
              <p className="text-sm text-muted-foreground">SGPA</p>
              <p className="font-semibold">{application.sgpa}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
          <CardDescription>All documents with verification status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Marksheet */}
            {application.documents.marksheet && (
              <div className="border-b pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Marksheet</h3>
                  <div className="flex items-center gap-2">
                    <ValidationIcon status={application.validation.marksMatch} />
                    <span className="text-sm capitalize">{application.validation.marksMatch}</span>
                  </div>
                </div>
                <img 
                  src={application.documents.marksheet} 
                  alt="Marksheet" 
                  className="max-w-md h-auto rounded-lg border"
                />
                {application.ocrData.extractedMarks && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <p><strong>OCR Extracted Marks:</strong> {application.ocrData.extractedMarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Aadhaar Card */}
            {application.documents.aadhaarCard && (
              <div className="border-b pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Aadhaar Card</h3>
                  <div className="flex items-center gap-2">
                    <ValidationIcon status={application.validation.aadhaarMatch} />
                    <span className="text-sm capitalize">{application.validation.aadhaarMatch}</span>
                  </div>
                </div>
                <img 
                  src={application.documents.aadhaarCard} 
                  alt="Aadhaar Card" 
                  className="max-w-md h-auto rounded-lg border"
                />
                {application.ocrData.extractedAadhaar && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <p><strong>OCR Extracted Aadhaar:</strong> ****{application.ocrData.extractedAadhaar.slice(-4)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Category Certificate */}
            {application.documents.categoryProof && (
              <div className="border-b pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Category Certificate</h3>
                  <div className="flex items-center gap-2">
                    <ValidationIcon status={application.validation.categoryMatch} />
                    <span className="text-sm capitalize">{application.validation.categoryMatch}</span>
                  </div>
                </div>
                <img 
                  src={application.documents.categoryProof} 
                  alt="Category Certificate" 
                  className="max-w-md h-auto rounded-lg border"
                />
                {application.ocrData.extractedCategory && (
                  <div className="mt-3 p-3 bg-muted rounded text-sm">
                    <p><strong>OCR Extracted Category:</strong> {application.ocrData.extractedCategory}</p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Photo */}
            {application.documents.profilePhoto && (
              <div className="border-b pb-6 last:border-b-0">
                <h3 className="font-semibold mb-4">Profile Photo</h3>
                <img 
                  src={application.documents.profilePhoto} 
                  alt="Profile Photo" 
                  className="max-w-xs h-auto rounded-lg border"
                />
                <p className="text-xs text-muted-foreground mt-2">No OCR processing</p>
              </div>
            )}

            {/* Signature */}
            {application.documents.signature && (
              <div>
                <h3 className="font-semibold mb-4">Signature</h3>
                <img 
                  src={application.documents.signature} 
                  alt="Signature" 
                  className="max-w-xs h-auto rounded-lg border"
                />
                <p className="text-xs text-muted-foreground mt-2">No OCR processing</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Application Status */}
      <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Current Status</p>
            <p className="font-semibold capitalize">{application.status}</p>
          </div>
          {application.meritRank && (
            <div>
              <p className="text-sm text-muted-foreground">Merit Rank</p>
              <p className="font-semibold">#{application.meritRank}</p>
            </div>
          )}
          {application.roomNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Allocated Room</p>
              <p className="font-semibold">{application.roomNumber}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/dashboard/application">Edit Application</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
